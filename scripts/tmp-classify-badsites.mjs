// 检查站点并可分类：SSL/404 → 下架候选；被墙 → 代理再验；CF 挑战 → 单独记录
// 用法：node scripts/tmp-classify-badsites.mjs
import "dotenv/config";
import "dotenv/config";
import { createClient } from "next-sanity";
import { readFileSync, writeFileSync } from "node:fs";
import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";

const client = createClient({ projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID, dataset: process.env.NEXT_PUBLIC_SANITY_DATASET, apiVersion: "2024-08-01", useCdn: false, token: process.env.SANITY_API_TOKEN });

const bad = JSON.parse(readFileSync(new URL("./tmp-badsites.json", import.meta.url), "utf-8"));
console.log("to classify:", bad.length);

const proxyAgent = new HttpsProxyAgent("http://127.0.0.1:7890");

const result = { ssl: [], notFound: [], cfChallenge: [], blocked: [], other: [] };

const isCFChallenge = (text) => /cf-browser-verification|challenge-platform|Just a moment|Checking your browser/i.test(text || "");
const isSSLErr = (msg) => /certificate|SSL|525|526|TLS|ERR_SSL|SELF_SIGNED|DEPTH_ZERO|unable to verify/i.test(msg || "");

const tryFetch = async (url, agent) => {
  return fetch(url, { redirect: "follow", signal: AbortSignal.timeout(8000), agent });
};

const classify = async (it) => {
  const link = (it.link || "").replace(/\?.*$/, "");
  const entry = (cat, detail) => result[cat].push({ ...it, detail });

  // 1. 直连
  try {
    const res = await tryFetch(link, undefined);
    const text = res.status >= 400 ? (await res.text()).slice(0, 1500) : "";
    const s = res.status;
    if (s >= 400 && isCFChallenge(text)) entry("cfChallenge", `direct:${s}`);
    else if (s === 404) entry("notFound", "direct:404");
    else if (s === 403) entry("cfChallenge", `direct:403-${isCFChallenge(text) ? "cf" : "other"}`);
    else if (s >= 500) entry("ssl", `direct:${s}`);
    else entry("other", `direct:${s}`);
    return;
  } catch (e) {
    const msg = e.message || "";
    if (isSSLErr(msg)) { entry("ssl", "direct-ssl:" + msg.slice(0, 50)); return; }

    // 2. 直连失败 → 过代理
    try {
      const pres = await tryFetch(link, proxyAgent);
      const ptext = pres.status >= 400 ? (await res_or_text(pres)).slice(0, 1500) : "";
      const ps = pres.status;
      if (pres.ok) entry("blocked", "direct-fail-proxy-ok");
      else if (ps === 404) entry("notFound", `proxy:404`);
      else if (ps >= 400 && isCFChallenge(ptext)) entry("cfChallenge", `proxy:${ps}-cf`);
      else if (ps >= 500) entry("ssl", `proxy:${ps}`);
      else entry("other", `proxy:${ps}`);
    } catch (pe) {
      const pmsg = pe.message || "";
      if (isSSLErr(pmsg)) entry("ssl", "proxy-ssl:" + pmsg.slice(0, 50));
      else entry("blocked", "proxy-fail:" + pmsg.slice(0, 50));
    }
  }
};

const res_or_text = async (r) => { try { return await r.text(); } catch { return ""; } };

let idx = 0;
const worker = async () => {
  while (idx < bad.length) {
    const my = idx++;
    await classify(bad[my]);
    if ((my + 1) % 30 === 0) console.log("classified", my + 1, "/", bad.length);
  }
};
await Promise.all(Array.from({ length: 5 }, worker));

writeFileSync(new URL("./tmp-classified.json", import.meta.url), JSON.stringify(result, null, 1));
console.log("=== 分类结果 ===");
for (const k of Object.keys(result)) console.log(k, result[k].length);