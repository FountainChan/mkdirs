// 生成站点状态记录文档（CF挑战/被墙/保留）
// 用法：node scripts/tmp-gen-record.mjs
import { readFileSync, writeFileSync } from "node:fs";
const cls = JSON.parse(readFileSync(new URL("./tmp-classified.json", import.meta.url), "utf-8"));
const date = "2026-08-19";

const md = [];
md.push("# 站点连通性与图片质量记录");
md.push("");
md.push(`> 扫描日期：${date} ｜ 范围：全部 1144 条 item ｜ 方法：直连 + 127.0.0.1:7890 代理二次验证`);
md.push("");
md.push("## 分类汇总");
md.push("");
md.push(`| 类别 | 数量 | 处置 |`);
md.push(`|---|---|---|`);
md.push(`| SSL 错误/不可达 | ${cls.ssl.length} | ✅ 已下架 |`);
md.push(`| 被墙（代理可达） | ${cls.blocked.filter((x) => x.detail.includes("proxy-ok")).length} | 保留 |`);
md.push(`| 被墙且代理不可达 | ${cls.blocked.filter((x) => x.detail.includes("proxy-fail")).length} | ✅ 已下架 |`);
md.push(`| Cloudflare 挑战页 | ${cls.cfChallenge.length} | 保留（图可能带 CF 挑战） |`);
md.push(`| 其他（200/429/403等） | ${cls.other.length} | 保留 |`);
md.push("");

md.push("## Cloudflare 挑战页（85 条）——图片需人工核验是否截到 CF 挑战画面");
md.push("");
md.push("| 名称 | 官网 | 详情 |");
md.push("|---|---|---|");
for (const x of cls.cfChallenge) md.push(`| ${x.name} | ${x.link} | ${x.detail} |`);
md.push("");

md.push("## 被墙但代理可达（保留，60 条）——源站活着，仅国内直连被墙");
md.push("");
md.push("| 名称 | 官网 |");
md.push("|---|---|");
for (const x of cls.blocked.filter((x) => x.detail.includes("proxy-ok"))) md.push(`| ${x.name} | ${x.link} |`);
md.push("");

md.push("## 已下架（23 条）详单见 unpublished-sites.md");
md.push("");
writeFileSync("docs/site-connectivity-record.md", md.join("\n"));
console.log("record written, cfChallenges:", cls.cfChallenge.length);