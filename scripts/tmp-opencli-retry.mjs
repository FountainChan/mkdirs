// 重试失败的截图：跳过已 OK 的，只处理 FAIL 的
// 用法：node scripts/tmp-opencli-retry.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const items = JSON.parse(readFileSync(path.join(projectRoot, "scripts", "fp-failed-detail.json"), "utf-8"));
const shotDir = path.join(projectRoot, "tmp-shots");
mkdirSync(shotDir, { recursive: true });

// 加载已有 mapping，跳过已 OK 的
const prevPath = path.join(shotDir, "mapping.json");
const prev = existsSync(prevPath) ? JSON.parse(readFileSync(prevPath, "utf-8")) : [];
const okNames = new Set(prev.filter((x) => x.status === "OK").map((x) => x.name));
const toRetry = items.filter((it) => !okNames.has(it.name));
console.log("total:", items.length, "| already OK:", okNames.size, "| to retry:", toRetry.length);

const session = "vfszuehh";
const mapping = [...prev]; // 保留已有结果

// 重试时：超时 90s（原 60s），sleep 8s（原 5s），失败后 close+重新 open
let ok = 0;
let fail = 0;
for (let i = 0; i < toRetry.length; i++) {
  const item = toRetry[i];
  const safeName = item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const filePath = path.join(shotDir, safeName + ".png");
  const link = (item.link || "").replace(/\?.*$/, "").replace(/"/g, "");

  // 先确保 session 干净
  try { execSync(`opencli browser ${session} close`, { encoding: "utf-8", timeout: 5000, shell: "bash" }); } catch {}

  let success = false;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      execSync(`opencli browser ${session} open "${link}"`, { encoding: "utf-8", timeout: 90000, shell: "bash" });
      execSync(`sleep 8`, { timeout: 12000, shell: "bash" });
      execSync(`opencli browser ${session} screenshot "${filePath}"`, { encoding: "utf-8", timeout: 30000, shell: "bash" });
      const stat = execSync(`ls -l "${filePath}"`, { encoding: "utf-8", timeout: 5000, shell: "bash" });
      const size = parseInt(stat.trim().split(/\s+/)[4]);
      if (size > 1000) {
        // 更新 mapping 里这条
        const idx = mapping.findIndex((x) => x.name === item.name);
        if (idx >= 0) mapping[idx] = { name: item.name, file: safeName + ".png", status: "OK", size };
        else mapping.push({ name: item.name, file: safeName + ".png", status: "OK", size });
        ok++;
        success = true;
        console.log(`[${i+1}/${toRetry.length}] OK(${attempt}) ${item.name} (${(size/1024).toFixed(0)}KB)`);
        break;
      }
    } catch (e) {
      console.log(`[${i+1}/${toRetry.length}] attempt${attempt} FAIL ${item.name} ${(e.message||"").slice(0,50)}`);
      // 连接断开时等几秒再重试
      execSync(`sleep 3`, { timeout: 5000, shell: "bash" }).toString();
    }
    try { execSync(`opencli browser ${session} close`, { encoding: "utf-8", timeout: 5000, shell: "bash" }); } catch {}
  }

  if (!success) {
    fail++;
    const idx = mapping.findIndex((x) => x.name === item.name);
    if (idx >= 0) mapping[idx] = { ...mapping[idx], status: "FAIL", error: "retry-failed" };
    else mapping.push({ name: item.name, file: safeName + ".png", status: "FAIL", error: "retry-failed" });
    console.log(`[${i+1}/${toRetry.length}] GIVEUP ${item.name}`);
  }
  // 持久化
  writeFileSync(path.join(shotDir, "mapping.json"), JSON.stringify(mapping, null, 1));
  try { execSync(`opencli browser ${session} close`, { encoding: "utf-8", timeout: 5000, shell: "bash" }); } catch {}
}

console.log(`retry done: new-ok=${ok} still-fail=${fail}`);