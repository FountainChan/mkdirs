// 用 opencli 浏览器截图 169 条站点，保存到 tmp-shots/{name}.png
// 用法：node scripts/tmp-opencli-screenshots.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const items = JSON.parse(readFileSync(path.join(projectRoot, "scripts", "fp-failed-detail.json"), "utf-8"));
const shotDir = path.join(projectRoot, "tmp-shots");
mkdirSync(shotDir, { recursive: true });

const session = "vfszuehh";
const mapping = [];
console.log("items to screenshot:", items.length);

for (let i = 0; i < items.length; i++) {
  const item = items[i];
  const safeName = item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const filePath = path.join(shotDir, safeName + ".png");
  const link = (item.link || "").replace(/\?.*$/, "").replace(/"/g, "");

  try {
    execSync(`opencli browser ${session} open "${link}"`, { encoding: "utf-8", timeout: 60000, shell: "bash" });
    execSync(`sleep 5`, { timeout: 10000, shell: "bash" });
    execSync(`opencli browser ${session} screenshot "${filePath}"`, { encoding: "utf-8", timeout: 30000, shell: "bash" });
    const stat = execSync(`ls -l "${filePath}"`, { encoding: "utf-8", timeout: 5000, shell: "bash" });
    const size = parseInt(stat.trim().split(/\s+/)[4]);
    if (size > 1000) {
      mapping.push({ name: item.name, file: safeName + ".png", status: "OK", size });
      console.log(`[${i+1}/${items.length}] OK ${item.name} (${(size/1024).toFixed(0)}KB)`);
    } else {
      mapping.push({ name: item.name, file: safeName + ".png", status: "FAIL", error: "too-small" });
      console.log(`[${i+1}/${items.length}] FAIL ${item.name} (too small)`);
    }
  } catch (e) {
    mapping.push({ name: item.name, file: safeName + ".png", status: "FAIL", error: (e.message||"").slice(0,80) });
    console.log(`[${i+1}/${items.length}] FAIL ${item.name} ${(e.message||"").slice(0,60)}`);
  }
  // 关闭 tab 释放 session
  try { execSync(`opencli browser ${session} close`, { encoding: "utf-8", timeout: 5000, shell: "bash" }); } catch {}
  // 持久化 mapping（每条都写，防丢）
  writeFileSync(path.join(shotDir, "mapping.json"), JSON.stringify(mapping, null, 1));
}

writeFileSync(path.join(shotDir, "mapping.json"), JSON.stringify(mapping, null, 1));
const ok = mapping.filter((x) => x.status === "OK").length;
console.log(`done: ok=${ok} fail=${mapping.length - ok}`);