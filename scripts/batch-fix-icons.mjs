// 补 icon：Google s2 favicon（挂代理 127.0.0.1:7890，sz=128 质量最佳）
// 用法：node scripts/batch-fix-icons.mjs
import "dotenv/config";
import { createClient } from "next-sanity";
import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-08-01",
  useCdn: false,
  perspective: "published",
  token: process.env.SANITY_API_TOKEN,
});

const agent = new HttpsProxyAgent("http://127.0.0.1:7890");

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");

const items = await client.fetch('*[_type == "item" && !defined(icon)]{_id, name, link}');
console.log("items missing icon:", items.length);

let ok = 0, fail = 0;
for (let i = 0; i < items.length; i++) {
  const item = items[i];
  let host = "";
  try { host = new URL(item.link || "").hostname; } catch { host = (item.link || "").replace(/^https?:\/\//, "").split("/")[0]; }
  const iconUrl = `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  try {
    const res = await fetch(iconUrl, { agent, signal: AbortSignal.timeout(15000) });
    if (!res.ok) { fail++; continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) { fail++; continue; }
    const asset = await client.assets.upload("image", buf, { filename: `${slugify(item.name)}_icon.png` });
    await client.patch(item._id).set({
      icon: { _type: "image", asset: { _type: "reference", _ref: asset._id }, alt: `Logo of ${item.name}` },
    }).commit();
    ok++;
    console.log(`[${i+1}/${items.length}] OK ${item.name}`);
  } catch {
    fail++;
    console.log(`[${i+1}/${items.length}] FAIL ${item.name}`);
  }
}
console.log(`done: ok=${ok} fail=${fail}`);