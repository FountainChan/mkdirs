// 修复 134 条 GIF 截图（thum.io 动画帧问题）：强制 Accept: image/png 重新截图替换
// 用法：node scripts/batch-fix-gif-images.mjs
import "dotenv/config";
import { createClient } from "next-sanity";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-08-01",
  useCdn: false,
  perspective: "published",
  token: process.env.SANITY_API_TOKEN,
});

const items = await client.fetch('*[_type == "item" && defined(image)]{_id, name, link, "ref": image.asset._ref}');
const gifItems = items.filter((x) => x.ref && x.ref.endsWith("-gif"));
console.log("gif items:", gifItems.length);

let ok = 0;
let fail = 0;
for (let i = 0; i < gifItems.length; i++) {
  const item = gifItems[i];
  const link = (item.link || "").replace(/\/+$/, "");
  const thumUrl = `https://image.thum.io/get/width/1200/crop/675/${link}`;
  try {
    const res = await fetch(thumUrl, {
      signal: AbortSignal.timeout(40000),
      headers: { Accept: "image/png" },
    });
    if (!res.ok) { fail++; console.log(`[${i+1}/${gifItems.length}] FAIL(${res.status}) ${item.name}`); continue; }
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/") || ct.includes("gif")) { fail++; console.log(`[${i+1}/${gifItems.length}] FAIL(ct:${ct}) ${item.name}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) { fail++; continue; }
    const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const asset = await client.assets.upload("image", buf, { filename: `${slug}_image.png` });
    await client.patch(item._id).set({
      image: { _type: "image", asset: { _type: "reference", _ref: asset._id }, alt: `Screenshot of ${item.name}` },
    }).commit();
    ok++;
    console.log(`[${i+1}/${gifItems.length}] OK ${item.name}`);
  } catch (e) {
    fail++;
    console.log(`[${i+1}/${gifItems.length}] FAIL ${item.name}: ${(e.message||"").slice(0,60)}`);
  }
}
console.log(`done: ok=${ok} fail=${fail}`);