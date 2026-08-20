// 补图第二波：Thum.io 截图（直连可用，免配置）
// 用法：node scripts/batch-fix-images-thum.mjs
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

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");

const items = await client.fetch('*[_type == "item" && !defined(image)]{_id, name, link}');
console.log("items still missing image:", items.length);

let ok = 0, fail = 0;
for (let i = 0; i < items.length; i++) {
  const item = items[i];
  const link = (item.link || "").replace(/\/+$/, "");
  const thumUrl = `https://image.thum.io/get/width/1200/crop/675/${link}`;
  try {
    const res = await fetch(thumUrl, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) { fail++; console.log(`[${i+1}/${items.length}] FAIL(${res.status}) ${item.name}`); continue; }
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) { fail++; console.log(`[${i+1}/${items.length}] FAIL(bad-ct) ${item.name}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) { fail++; console.log(`[${i+1}/${items.length}] FAIL(too-small) ${item.name}`); continue; }
    const asset = await client.assets.upload("image", buf, { filename: `${slugify(item.name)}_image.png` });
    await client.patch(item._id).set({
      image: { _type: "image", asset: { _type: "reference", _ref: asset._id }, alt: `Screenshot of ${item.name}` },
    }).commit();
    ok++;
    console.log(`[${i+1}/${items.length}] OK ${item.name}`);
  } catch (e) {
    fail++;
    console.log(`[${i+1}/${items.length}] FAIL(err) ${item.name}`);
  }
}
console.log(`done: ok=${ok} fail=${fail}`);