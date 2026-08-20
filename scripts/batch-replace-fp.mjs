// 只替换 futurepedia 来源的图片（带水印）
// 用法：node scripts/batch-replace-fp.mjs
import "dotenv/config";
import { createClient } from "next-sanity";
import { readFileSync } from "node:fs";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-08-01",
  useCdn: false,
  perspective: "published",
  token: process.env.SANITY_API_TOKEN,
});

const sourcePages = JSON.parse(readFileSync(new URL("./tmp-source-pages.json", import.meta.url), "utf-8"));
const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");

// 拿所有有 futurepedia 来源的 item（只取有 image 的）
const items = await client.fetch('*[_type == "item" && defined(image)]{_id, name, link}');
const fpItems = items.filter((it) => {
  const link = (it.link || "").replace(/\/+$/, "");
  const src = (sourcePages[link] || "");
  return src.includes("futurepedia");
});
console.log("items with futurepedia source:", fpItems.length);

let ok = 0, fail = 0;
for (let i = 0; i < fpItems.length; i++) {
  const item = fpItems[i];
  const link = (item.link || "").replace(/\/+$/, "");
  const thumUrl = `https://image.thum.io/get/width/1200/crop/675/${link}`;
  try {
    const res = await fetch(thumUrl, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) { fail++; console.log(`[${i+1}/${fpItems.length}] FAIL(${res.status}) ${item.name}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) { fail++; continue; }
    const asset = await client.assets.upload("image", buf, { filename: `${slugify(item.name)}_image.png` });
    await client.patch(item._id).set({
      image: { _type: "image", asset: { _type: "reference", _ref: asset._id }, alt: `Screenshot of ${item.name}` },
    }).commit();
    ok++;
    console.log(`[${i+1}/${fpItems.length}] OK ${item.name}`);
  } catch {
    fail++;
    console.log(`[${i+1}/${fpItems.length}] FAIL ${item.name}`);
  }
}
console.log(`done: ok=${ok} fail=${fail}`);