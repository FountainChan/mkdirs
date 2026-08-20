// 批量补图：从来源目录页（futurepedia 优先）提取工具截图，上传 Sanity
// 用法：node scripts/batch-fix-images.mjs
import { createClient } from "next-sanity";
import { readFileSync } from "node:fs";

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-08-01",
  useCdn: false,
  perspective: "published",
  token: process.env.SANITY_API_TOKEN,
});

const sourcePages = JSON.parse(readFileSync(new URL("./tmp-source-pages.json", import.meta.url), "utf-8"));

const extractImage = (html) => {
  const m = html.match(/<meta[^>]+(?:property|name)="(?:og:image|twitter:image)"[^>]+content="([^"]+)"/i);
  if (m?.[1] && m[1].includes("cdn")) return m[1];
  const cdn = html.match(/srcSet="[^"]*(https:\/\/cdn[^"]+?\.(?:png|jpg|jpeg))"/i);
  if (cdn?.[1]) return cdn[1];
  return null;
};

const uploadImage = async (imageUrl, name) => {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/") || ct.includes("svg")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return null;
    const asset = await client.assets.upload("image", buf, { filename: `${slugify(name)}_image.png` });
    return asset._id;
  } catch { return null; }
};

const items = await client.fetch('*[_type == "item" && !defined(image)]{_id, name, link}');
console.log("items missing image:", items.length);

let ok = 0, fail = 0, skip = 0;
for (let i = 0; i < items.length; i++) {
  const item = items[i];
  const link = (item.link || "").replace(/\/+$/, "");
  const sources = (sourcePages[link] || "").split(";").map((s) => s.trim()).filter(Boolean);
  const fpUrls = sources.filter((s) => s.includes("futurepedia"));
  if (fpUrls.length === 0) { skip++; console.log(`[${i+1}/${items.length}] SKIP(no-source) ${item.name}`); continue; }

  let imageUrl = null;
  for (const src of fpUrls) {
    try {
      const res = await fetch(src, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) continue;
      imageUrl = extractImage(await res.text());
      if (imageUrl) break;
    } catch { continue; }
  }
  if (!imageUrl) { skip++; console.log(`[${i+1}/${items.length}] SKIP(no-img) ${item.name}`); continue; }

  const assetId = await uploadImage(imageUrl, item.name);
  if (!assetId) { fail++; console.log(`[${i+1}/${items.length}] FAIL(upload) ${item.name}`); continue; }

  await client.patch(item._id).set({
    image: { _type: "image", asset: { _type: "reference", _ref: assetId }, alt: `Screenshot of ${item.name}` },
  }).commit();
  ok++;
  console.log(`[${i+1}/${items.length}] OK ${item.name}`);
}
console.log(`done: ok=${ok} fail=${fail} skip=${skip}`);