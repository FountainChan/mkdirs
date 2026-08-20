// 扫描全部 item 的源站可达性，输出错误站点 JSON
// 用法：node scripts/tmp-scan-badsites.mjs
import "dotenv/config";
import { createClient } from "next-sanity";
import { writeFileSync } from "node:fs";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-08-01",
  useCdn: false,
  perspective: "published",
  token: process.env.SANITY_API_TOKEN,
});

const items = await client.fetch('*[_type == "item" && publishDate != null]{_id, name, link}');
console.log("items to check:", items.length);

const bad = [];
let checked = 0;
const concurrency = 5;
let idx = 0;

const worker = async () => {
  while (idx < items.length) {
    const my = idx++;
    const it = items[my];
    const link = (it.link || "").replace(/\?.*$/, "");
    try {
      const res = await fetch(link, { redirect: "follow", signal: AbortSignal.timeout(15000) });
      if (res.status >= 400) bad.push({ _id: it._id, name: it.name, link: it.link, status: res.status });
    } catch (e) {
      bad.push({ _id: it._id, name: it.name, link: it.link, status: (e.message || "").slice(0, 60) });
    }
    checked++;
    if (checked % 50 === 0) console.log("checked:", checked, "/", items.length, "bad:", bad.length);
  }
};

await Promise.all(Array.from({ length: concurrency }, worker));
writeFileSync(new URL("./tmp-badsites.json", import.meta.url), JSON.stringify(bad, null, 1));
console.log("done. checked:", checked, "bad:", bad.length);