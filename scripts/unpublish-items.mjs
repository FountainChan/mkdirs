#!/usr/bin/env node
// 下架 item：读文件名列表（每行一个 safe-name 或直接 item 名），publishDate 置 null
// 记录追加到 docs/unpublished-sites.md（可追溯）
// 用法：
//   node scripts/unpublish-items.mjs tmp-shots/Remove/            # 目录下所有 png 文件名
//   node scripts/unpublish-items.mjs list.txt                      # 文本文件，每行一个名称
//   node scripts/unpublish-items.mjs "gencraft" "replika"          # 命令行直接传名称
import "dotenv/config";
import { createClient } from "next-sanity";
import { readdirSync, readFileSync, appendFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const detailPath = path.join(projectRoot, "scripts", "fp-failed-detail.json");

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-08-01",
  useCdn: false,
  perspective: "published",
  token: process.env.SANITY_API_TOKEN,
});

// 解析输入 → safe-name 列表
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("用法: node scripts/unpublish-items.mjs <目录|文件|名称...>");
  process.exit(1);
}
let names = [];
for (const a of args) {
  const p = path.resolve(a);
  try {
    const st = statSync(p);
    if (st.isDirectory()) {
      names.push(...readdirSync(p).filter((f) => f.endsWith(".png")).map((f) => f.replace(".png", "")));
    } else {
      names.push(...readFileSync(p, "utf-8").split(/\r?\n/).map((l) => l.trim().split("|")[0]).filter(Boolean));
    }
  } catch {
    names.push(a); // 当作名称直接传
  }
}
names = [...new Set(names.map((n) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-")))];
console.log("to unpublish:", names.length, names);

// safe-name → item
const detail = existsSync(detailPath) ? JSON.parse(readFileSync(detailPath, "utf-8")) : [];
const bySafe = new Map(detail.map((d) => [d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), d]));

const date = new Date().toISOString().slice(0, 10);
const records = [];
for (const n of names) {
  // 1. 先查本地 fp-failed-detail.json
  let item = bySafe.get(n);

  // 2. 本地查不到 → 查 Sanity（按 slug 和 name 双维度）
  if (!item) {
    try {
      const found = await client.fetch(
        `*[_type == "item" && (slug.current == $slug || lower(name) == $lowerName)]{_id, name, link}`,
        { slug: n, lowerName: n.replace(/-/g, " ") },
      );
      if (found.length > 0) item = found[0];
    } catch (e) {
      console.log(`QUERY-FAIL ${n}: ${(e.message || "").slice(0, 50)}`);
    }
  }

  if (!item) {
    console.log(`SKIP(no-mapping) ${n}`);
    continue;
  }

  try {
    await client.patch(item._id).set({ publishDate: null }).commit();
    records.push({ name: item.name, link: item.link, reason: "manual-unpublish" });
    console.log(`OK ${item.name}`);
  } catch (e) {
    console.log(`FAIL ${item.name}: ${(e.message || "").slice(0, 50)}`);
  }
}

// 追加记录到 docs
const docPath = path.join(projectRoot, "docs", "unpublished-sites.md");
appendFileSync(docPath, `\n\n## ${date} 批次（${records.length} 条）\n\n| 名称 | 官网 | 原因 |\n|---|---|---|\n` +
  records.map((r) => `| ${r.name} | ${r.link} | ${r.reason} |`).join("\n") + "\n");
console.log(`done: ${records.length} unpublished, 记录已追加 docs/unpublished-sites.md`);