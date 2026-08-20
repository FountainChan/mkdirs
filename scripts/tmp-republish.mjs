// 恢复发布：代理可达的 29 条
// 用法：node scripts/tmp-republish.mjs
import "dotenv/config";
import { createClient } from "next-sanity";
import { readFileSync } from "node:fs";
const client = createClient({ projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID, dataset: process.env.NEXT_PUBLIC_SANITY_DATASET, apiVersion: "2024-08-01", useCdn: false, token: process.env.SANITY_API_TOKEN });
const r = JSON.parse(readFileSync(new URL("./tmp-retest-results.json", import.meta.url), "utf-8"));
const reachable = r.filter((x) => /^[23]\d\d$/.test(x.status));
console.log("republishing:", reachable.length);
let ok = 0;
for (const it of reachable) {
  try { await client.patch(it._id).set({ publishDate: new Date() }).commit(); ok++; }
  catch (e) { console.log("FAIL", it.name, e.message.slice(0, 50)); }
}
console.log("done:", ok);