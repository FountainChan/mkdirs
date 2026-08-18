// 一次性代理引导：
// 1. npm undici 的 setGlobalDispatcher 只影响自己包的 fetch，不影响 Node 内置 fetch
// 2. 故同时用 npm undici 的 fetch 覆盖 globalThis.fetch，让 AI SDK 等库走代理
// 3. node-fetch v3 不读 globalThis.fetch，但用 node:https 全局 agent，故也替换之
// 用法：HTTPS_PROXY=... node --import ./scripts/tmp-proxy.mjs node_modules/tsx/dist/cli.mjs ...
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxy) {
  const undici = await import("undici");
  undici.setGlobalDispatcher(new undici.ProxyAgent(proxy));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    if (init?.dispatcher) return originalFetch(input, init);
    return undici.fetch(input, init);
  };
  // node-fetch v3 兜底：替换 https/http 全局 agent（ESM namespace 只读，用 createRequire 拿 CJS）
  const { HttpsProxyAgent } = await import("https-proxy-agent");
  const { HttpProxyAgent } = await import("http-proxy-agent");
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  require("node:https").globalAgent = new HttpsProxyAgent(proxy);
  require("node:http").globalAgent = new HttpProxyAgent(proxy);
  console.log(`[proxy] global fetch + dispatcher + agents -> ${proxy}`);
}
