// 重测有发布站点：curl 走 127.0.0.1:7890 代理
// 用法：node scripts/tmp-retest.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const items = JSON.parse(readFileSync(new URL("./tmp-unpublished-64.json", import.meta.url), "utf-8"));
console.log("to retest:", items.length);

const probe = (url) => {
  const cmd = `curl -s -o /dev/null -w "%{http_code}" --max-time 20 -x http://127.0.0.1:7890 "${url}"`;
  return execSync(cmd, { encoding: "utf-8", timeout: 30000, shell: "bash" }).trim();
};

const results = [];
for (let i = 0; i < items.length; i++) {
  const it = items[i];
  const link = (it.link || "").replace(/\?.*$/, "").replace(/"/g, "");
  try {
    const code = probe(link);
    results.push({ ...it, status: code });
    console.log(`[${i + 1}/${items.length}] ${code} ${it.name}`);
  } catch {
    results.push({ ...it, status: "ERR" });
    console.log(`[${i + 1}/${items.length}] ERR ${it.name}`);
  }
}
writeFileSync(new URL("./tmp-retest-results.json", import.meta.url), JSON.stringify(results, null, 1));
const reachable = results.filter((x) => /^[23]\d\d$/.test(x.status));
const err = results.filter((x) => x.status === "ERR");
console.log("reachable (2xx/3xx):", reachable.length, "| ERR:", err.length);