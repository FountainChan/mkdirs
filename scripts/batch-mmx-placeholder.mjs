// 对带 futurepedia 水印的 169 条 item，用 mmx 生成 16:9 占位图并上传 Sanity
// 用法：node scripts/batch-mmx-placeholder.mjs
import "dotenv/config";
import { createClient } from "next-sanity";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import os from "node:os";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-08-01",
  useCdn: false,
  perspective: "published",
  token: process.env.SANITY_API_TOKEN,
});

const items = JSON.parse(readFileSync(new URL("./fp-failed-detail.json", import.meta.url), "utf-8"));
console.log("items to process:", items.length);
const tmpDir = os.tmpdir() + "/mmx-ph";

let ok = 0;
let fail = 0;
let quota = 0;

for (let i = 0; i < items.length; i++) {
  const item = items[i];
  const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const prompt = `Minimalist 16:9 website screenshot style illustration for an AI tool called "${item.name}", clean modern gradient background, subtle abstract tech shapes, professional, no text, no watermark`;
  try {
    const shell = `mmx image generate --prompt ${JSON.stringify(prompt)} --aspect-ratio 16:9 --n 1 --out-dir ${JSON.stringify(tmpDir)} --out-prefix ph_${i} --quiet`;
    const out = execSync(shell, { encoding: "utf-8", timeout: 120000, shell: "bash" });
    const imgPath = out.trim().split("\n").pop().trim();
    if (!imgPath) { quota++; console.log(`[${i+1}/${items.length}] SKIP ${item.name}`); continue; }
    const buf = readFileSync(imgPath);
    const asset = await client.assets.upload("image", buf, { filename: `${slug}_placeholder.png` });
    await client.patch(item._id).set({
      image: { _type: "image", asset: { _type: "reference", _ref: asset._id }, alt: `Screenshot of ${item.name}` },
    }).commit();
    ok++;
    console.log(`[${i+1}/${items.length}] OK ${item.name}`);
  } catch (e) {
    const msg = e.message || "";
    if (/quota/i.test(msg)) { quota++; console.log(`[${i+1}/${items.length}] QUOTA ${item.name}`); }
    else { fail++; console.log(`[${i+1}/${items.length}] FAIL ${item.name}: ${msg.slice(0, 80)}`); }
  }
}
console.log(`done: ok=${ok} fail=${fail} quota=${quota}`);