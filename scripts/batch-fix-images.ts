import { slugify } from "@/lib/utils";
import { createClient } from "@sanity/client";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import fetch from "node-fetch";
dotenv.config();

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2024-08-01",
  useCdn: false,
  perspective: "published",
  token: process.env.SANITY_API_TOKEN,
});

const sourcePages = JSON.parse(
  readFileSync(new URL("./tmp-source-pages.json", import.meta.url), "utf-8"),
) as Record<string, string>;

const extractImage = (html: string): string | null => {
  const m = html.match(
    /<meta[^>]+(?:property|name)="(?:og:image|twitter:image)"[^>]+content="([^"]+)"/i,
  );
  if (m?.[1] && m[1].includes("cdn")) return m[1];
  const cdn = html.match(
    /srcSet="[^"]*(https:\/\/cdn[^"]+?\.(?:png|jpg|jpeg))"/i,
  );
  if (cdn?.[1]) return cdn[1];
  return null;
};

const uploadImage = async (imageUrl: string, name: string) => {
  try {
    const res = await fetch(imageUrl, { timeout: 30000 });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/") || ct.includes("svg")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return null;
    const asset = await client.assets.upload("image", buf, {
      filename: `${slugify(name)}_image.png`,
    });
    return asset._id;
  } catch {
    return null;
  }
};

const main = async () => {
  const items = await client.fetch<Array<{ _id: string; name: string; link: string }>>(
    '*[_type == "item" && !defined(image)]{_id, name, link}',
  );
  console.log("items missing image:", items.length);
  let ok = 0;
  let fail = 0;
  let skip = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const link = item.link?.replace(/\/+$/, "");
    const sources = (sourcePages[link || ""] || "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    const fpUrls = sources.filter((s) => s.includes("futurepedia"));
    if (fpUrls.length === 0) {
      skip++;
      console.log(`[${i + 1}/${items.length}] SKIP(no-source) ${item.name}`);
      continue;
    }

    let imageUrl: string | null = null;
    for (const src of fpUrls) {
      try {
        const res = await fetch(src, { signal: AbortSignal.timeout(20000) as never });
        if (!res.ok) continue;
        const html = await res.text();
        imageUrl = extractImage(html);
        if (imageUrl) break;
      } catch {
        continue;
      }
    }

    if (!imageUrl) {
      skip++;
      console.log(`[${i + 1}/${items.length}] SKIP(no-img) ${item.name}`);
      continue;
    }

    const assetId = await uploadImage(imageUrl, item.name);
    if (!assetId) {
      fail++;
      console.log(`[${i + 1}/${items.length}] FAIL(upload) ${item.name}`);
      continue;
    }

    await client.patch(item._id).set({
      image: {
        _type: "image",
        asset: { _type: "reference", _ref: assetId },
        alt: `Screenshot of ${item.name}`,
      },
    }).commit();
    ok++;
    console.log(`[${i + 1}/${items.length}] OK ${item.name}`);
  }

  console.log(`done: ok=${ok} fail=${fail} skip=${skip}`);
};

main();