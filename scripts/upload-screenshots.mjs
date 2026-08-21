#!/usr/bin/env node
// 上传本地截图到 Sanity 并更新对应 item 的 image 字段
// 扫描 tmp-shots/ 根目录所有 .png（跳过子目录 blank/CloudflareBlock/Remove 和 mapping.json）
// 文件名（safe-name）映射回 item：通过 scripts/fp-failed-detail.json 的 name 匹配
// 断点续跑：已是最新图的跳过（按文件名记录已上传清单 tmp-shots/uploaded.json）
// 用法：node scripts/upload-screenshots.mjs [--dry-run]
import "dotenv/config";
import { createClient } from "next-sanity";
import { readdirSync, readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const shotDir = path.join(projectRoot, "tmp-shots");
const detailPath = path.join(projectRoot, "scripts", "fp-failed-detail.json");
const uploadedPath = path.join(shotDir, "uploaded.json");

const DRY_RUN = process.argv.includes("--dry-run");

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-08-01",
  useCdn: false,
  perspective: "published",
  token: process.env.SANITY_API_TOKEN,
});

// 文件名（无扩展名）→ item 明细（fp-failed-detail.json + Sanity 全量兜底）
const detail = JSON.parse(readFileSync(detailPath, "utf-8"));
const bySafeName = new Map();
for (const d of detail) {
  bySafeName.set(d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), d);
}
// Sanity 兜底：不在 detail 里的 item 也建映射（name slug + item slug 双键）
const allItems = await client.fetch('*[_type == "item"]{_id, name, "slug": slug.current, link}');
for (const a of allItems) {
  const safe = a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (!bySafeName.has(safe)) bySafeName.set(safe, a);
  if (a.slug && !bySafeName.has(a.slug)) bySafeName.set(a.slug, a);
}

// 已上传记录（断点续跑）
const uploaded = existsSync(uploadedPath) ? JSON.parse(readFileSync(uploadedPath, "utf-8")) : [];

const files = readdirSync(shotDir).filter((f) => f.endsWith(".png"));
console.log(`found ${files.length} png files in tmp-shots/ ${DRY_RUN ? "(dry-run)" : ""}`);

let ok = 0;
let skip = 0;
let fail = 0;
const results = [];
for (const f of files) {
  const safeName = f.replace(".png", "");
  const item = bySafeName.get(safeName);
  if (!item) { skip++; console.log(`SKIP(no-mapping) ${f}`); continue; }
  if (uploaded.includes(f)) { skip++; console.log(`SKIP(already) ${f}`); continue; }

  const filePath = path.join(shotDir, f);
  const buf = readFileSync(filePath);
  if (buf.length < 10240) { skip++; console.log(`SKIP(too-small) ${f}`); continue; }

  if (DRY_RUN) { console.log(`DRY ${f} -> ${item.name} (${(buf.length / 1024).toFixed(0)}KB)`); continue; }

  try {
    const asset = await client.assets.upload("image", buf, { filename: f });
    await client.patch(item._id).set({
      image: { _type: "image", asset: { _type: "reference", _ref: asset._id }, alt: `Screenshot of ${item.name}` },
    }).commit();
    uploaded.push(f);
    writeFileSync(uploadedPath, JSON.stringify(uploaded, null, 1));
    ok++;
    console.log(`OK ${item.name} <- ${f} (${(buf.length / 1024).toFixed(0)}KB)`);

    // 上传成功后移入 drop 目录
    if (!DRY_RUN) {
      const dropDir = path.join(shotDir, "drop");
      mkdirSync(dropDir, { recursive: true });
      try { renameSync(filePath, path.join(dropDir, f)); } catch {}
    }
  } catch (e) {
    fail++;
    console.log(`FAIL ${f}: ${(e.message || "").slice(0, 60)}`);
  }
}
console.log(`done: ok=${ok} skip=${skip} fail=${fail}`);