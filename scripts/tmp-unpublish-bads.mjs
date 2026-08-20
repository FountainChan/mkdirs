// 下架站点：SSL/不可达类（ssl + proxy-fail），记录到 docs
// 用法：node scripts/tmp-unpublish-bads.mjs
import "dotenv/config";
import { createClient } from "next-sanity";
import { readFileSync, writeFileSync } from "node:fs";

const client = createClient({ projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID, dataset: process.env.NEXT_PUBLIC_SANITY_DATASET, apiVersion: "2024-08-01", useCdn: false, token: process.env.SANITY_API_TOKEN });

const cls = JSON.parse(readFileSync(new URL("./tmp-classified.json", import.meta.url), "utf-8"));
const toUnpublish = [...cls.ssl, ...cls.blocked.filter((x) => x.detail.startsWith("proxy-fail"))];
console.log("to unpublish:", toUnpublish.length);

let ok = 0;
const records = [];
for (const it of toUnpublish) {
  try {
    await client.patch(it._id).set({ publishDate: null }).commit();
    records.push({ name: it.name, link: it.link, reason: it.detail, _id: it._id });
    ok++;
  } catch (e) {
    console.log("FAIL", it.name, e.message.slice(0, 60));
  }
}
writeFileSync(new URL("../docs/unpublished-sites.md", import.meta.url), [
  "# 已下架站点记录",
  "",
  `> 下架日期：2026-08-19 ｜ 数量：${records.length} ｜ 原因：SSL 错误/站点不可达`,
  "",
  "| 名称 | 官网 | 原因 |",
  "|---|---|---|",
  ...records.map((r) => `| ${r.name} | ${r.link} | ${r.reason} |`),
].join("\n"));

console.log("unpublished:", ok);