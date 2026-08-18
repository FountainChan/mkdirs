import { slugify } from "@/lib/utils";
import type { Category, Tag } from "@/sanity.types";
import mql from "@microlink/mql";
import { createClient } from "@sanity/client";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import fetch from "node-fetch";
import { z } from "zod";
dotenv.config();

// make sure you have set the environment variables in .env file
const client = createClient({
  // biome-ignore lint/style/noNonNullAssertion: <explanation>
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  // biome-ignore lint/style/noNonNullAssertion: <explanation>
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2024-08-01",
  useCdn: false,
  perspective: "published",
  token: process.env.SANITY_API_TOKEN,
});

/**
 * AI-Powered Item Management System
 * 
 * An automated script for managing content items in Sanity CMS using AI SDK
 * and Microlink for data enrichment.
 * 
 * Core Functions:
 * 1. Content Scraping: Extract data from URLs using Microlink
 * 2. AI Analysis: Process content using Google's Gemini AI
 * 3. Asset Management: Handle images and icons
 * 4. Database Operations: CRUD operations in Sanity
 * 
 * Data Processing Flow:
 * 1. URL → Microlink (metadata) + AI SDK (content analysis)
 * 2. Data Enrichment → Categories & Tags mapping
 * 3. Asset Processing → Icon & Image handling
 * 4. Sanity Import → Structured content creation
 * 
 * Content Structure:
 * - name: Title of the item
 * - slug: Auto-generated URL-friendly identifier
 * - description: AI-generated short description (160 chars)
 * - introduction: AI-generated detailed markdown content
 * - link: Source URL
 * - categories: Auto-mapped category references
 * - tags: Auto-mapped tag references
 * - image: Screenshot or main image
 * - icon: Favicon or logo
 * 
 * Key Features:
 * - AI-powered content analysis
 * - Automated metadata extraction
 * - Smart category/tag mapping
 * - Automated asset management
 * - Bulk processing support
 * 
 * Requirements:
 * - Sanity CMS credentials
 * - Google AI SDK access
 * - Microlink API access
 * - Environment variables configured
 * 
 * Usage:
 * 1. pnpm run item remove
 * remove all items
 * 2. pnpm run item import
 * import all items defined in links array
 * 3. pnpm run item update
 * update all items
 * 4. pnpm run item fetch <url>
 * fetch item info for the specified url
 */
// 冷启动链接清单 + 元数据（P0/P1 已去重，含 xlsx 权威工具名/类目/关键词）
const coldstartMeta: Record<
  string,
  { name: string; category: string; keywords: string; priority: string }
> = JSON.parse(
  readFileSync(new URL("./coldstart-meta.json", import.meta.url), "utf-8"),
);
const links: string[] = Object.keys(coldstartMeta);

// xlsx 统一类目（中文）→ 站内类目（英文）映射；"其他" 交给 AI 现场判断
const CATEGORY_MAPPING: Record<string, string> = {
  对话助手: "AI Chat",
  设计工具: "Design Tools",
  写作工具: "Writing Tools",
  音频处理: "Audio Tools",
  图像生成: "Image Generation",
  视频生成: "Video Generation",
  编程开发: "Developer Tools",
  营销工具: "Marketing Tools",
  搜索与研究: "Search and Research",
  办公工具: "Office Tools",
  数据处理: "Data Tools",
  娱乐创作: "Entertainment",
  翻译工具: "Translation",
};

export const removeItems = async () => {
  const data = await client.delete({
    query: "*[_type == 'item']",
  });
  console.log("removeItems:", data);
};

/**
 * fetch item info for the specified url with Microlink and AI SDK
 */
export const fetchItem = async (url: string) => {
  const meta =
    coldstartMeta[url] || coldstartMeta[url.replace(/\/+$/, "")];

  // step 1: fetch item info with Microlink
  const microlinkData = await fetchItemWithMicrolink(url);

  // step 2: fetch item info with AI SDK
  const aisdkData = await fetchItemWithAISdk(url, meta);
  if (!aisdkData) {
    console.error("fetchItem: aisdkData is null, url:", url);
    return null;
  }

  // 名称：xlsx 权威名优先；无元数据时过滤挑战页/错误页垃圾标题
  const JUNK_TITLE =
    /cloudflare|just a moment|security (check|challenge)|access denied|attention required|error 40[34]|请输入|验证/i;
  let name = aisdkData.object.title?.trim() || "";
  if (meta?.name) {
    name = meta.name;
  } else if (!name || JUNK_TITLE.test(name)) {
    console.error(`fetchItem: junk/empty title "${name}", url:`, url);
    return null;
  }

  // 类目：xlsx 映射为主，AI 所选补充（去重，至多 3 个）；全空则归 AI Tools
  const mappedCategory = meta ? CATEGORY_MAPPING[meta.category] : undefined;
  const mergedCategories = [
    ...(mappedCategory ? [mappedCategory] : []),
    ...aisdkData.object.categories.filter(
      (c: string) => c !== mappedCategory,
    ),
  ].slice(0, 3);
  const finalCategories =
    mergedCategories.length > 0 ? mergedCategories : ["AI Tools"];

  // step 3: merge the data
  let host = url;
  try {
    host = new URL(url).hostname;
  } catch {}
  const mergedData = {
    link: url,
    name,
    description: aisdkData.object.description,
    introduction: aisdkData.object.introduction,
    categories: finalCategories,
    tags: aisdkData.object.tags,
    // og:image 优先（免费不限量），microlink 截图兜底
    image: aisdkData.ogImage || microlinkData?.image?.url,
    // microlink logo → DuckDuckGo favicon（国内可达）兜底
    icon:
      microlinkData?.logo?.url ||
      `https://icons.duckduckgo.com/ip3/${host}.ico`,
  };
  console.log("fetchItem, url:", url, "mergedData:", mergedData);
  return mergedData;
};

/**
 * fetch item info for the specified url with Microlink
 */
export const fetchItemWithMicrolink = async (url: string) => {
  try {
    const { data } = await mql(url, {
      // information included:
      // - title: page title
      // - description: page description
      // - lang: page language
      // - author: author information
      // - publisher: publisher information
      // - image: main image
      // - logo: website logo
      // - url: normalized URL
    });
    // console.log("fetchItemWithMicrolink, url:", url, "data:", data);
    return data;
  } catch (error) {
    console.error(
      `fetchItemWithMicrolink, Error processing url for ${url}:`,
      error,
    );
    return null;
  } 
};

/**
 * fetch item info for the specified url with AI SDK
 */
export const fetchItemWithAISdk = async (
  url: string,
  meta?: { name: string; category: string; keywords: string },
) => {
  try {
    // get all categories and tags
    const categories = await client.fetch<Category[]>(`*[_type == "category"]`);
    const tags = await client.fetch<Tag[]>(`*[_type == "tag"]`);
    const availableCategories = categories.map((cat) => cat.name);
    const availableTags = tags.map((tag) => tag.name);

    const schema = z.object({
      title: z.string().describe("A short, concise name without description"),
      description: z
        .string()
        .max(160)
        .describe("One sentence summary, max 160 characters"),
      introduction: z
        .string()
        .describe("Detailed introduction in markdown format"),
      categories: z
        .array(z.string())
        .describe("Array of category names that best match the content"),
      tags: z
        .array(z.string())
        .describe("Array of tag names that best match the content")
    });

    const response = await fetch(url);
    const htmlContent = (await response.text())
      .replace(/class="[^"]*"/g, '')
      .replace(/<svg[^>]*>.*?<\/svg>/g, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    const mappedCategory = meta ? CATEGORY_MAPPING[meta.category] : undefined;
    const hintText = meta
      ? `
      Known tool information (authoritative, from source directory):
      - Tool name: ${meta.name} (use this exact name as the title)
      - Category hint: ${mappedCategory || meta.category || "unknown"}
      - Reference keywords: ${meta.keywords || "n/a"}

      NOTE: If the page content above is a bot-check / challenge page, an error page,
      or lacks substance, write the description and introduction based on your own
      knowledge of this tool instead of the page content.
      `
      : "";

    const promptText = `Analyze the following webpage content and provide structured information:
${hintText}
      Content to analyze:
      ${htmlContent}

      Available Categories:
      ${availableCategories.join(", ")}

      Available Tags:
      ${availableTags.join(", ")}

      Please analyze the content and provide:
      1. A concise title (just the name, no description)
      2. A brief description (one sentence, max 160 characters)
      3. A detailed introduction in markdown format (include key features and use cases)
      4. Select appropriate categories from the available categories list (return array of names)
      5. Select relevant tags from the available tags list (return array of names)

      IMPORTANT: Write the description and introduction in Simplified Chinese (简体中文).
      Keep the title in its original form (usually English). Category and tag names must
      stay exactly as given in the lists above (English).

      Focus on technical aspects and practical applications. If the content is a tool or service,
      emphasize its main features, target users, and unique selling points.`;

    // og:image 提取（作为 image 字段兜底，免 Microlink 限额）
    const ogm = htmlContent.match(
      /<meta[^>]+(?:property=["']og:image["'][^>]+content=["']([^"']+)["']|content=["']([^"']+)["'][^>]+property=["']og:image["'])/i,
    );
    let ogImage = (ogm?.[1] || ogm?.[2] || "").trim();
    if (ogImage.startsWith("//")) ogImage = `https:${ogImage}`;
    else if (ogImage.startsWith("/"))
      ogImage = new URL(url).origin + ogImage;

    // 直接非流式调用本地网关（json_schema 结构化输出），避开 SDK 流式解析不兼容；带重试
    const aiBaseURL = process.env.AI_BASE_URL || "http://localhost:20128/v1";
    const aiApiKey = process.env.AI_API_KEY || "sk-d88c82e9aa88b941-1fe8bc-47954127";
    const aiModel = process.env.AI_MODEL || "agy/gemini-3.6-flash-high";
    const requestBody = JSON.stringify({
      model: aiModel,
      messages: [{ role: "user", content: promptText }],
      temperature: 0,
      max_tokens: 8192,
      stream: false,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "item",
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              introduction: { type: "string" },
              categories: { type: "array", items: { type: "string" } },
              tags: { type: "array", items: { type: "string" } },
            },
            required: ["title", "description", "introduction", "categories", "tags"],
          },
        },
      },
    });

    let object: z.infer<typeof schema> | null = null;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const aiRes = await fetch(`${aiBaseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${aiApiKey}`,
          },
          body: requestBody,
          timeout: 180000,
        });
        const aiJson = (await aiRes.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const content = aiJson?.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error(
            `empty content, raw: ${JSON.stringify(aiJson).slice(0, 200)}`,
          );
        }
        object = schema.parse(JSON.parse(content));
        break;
      } catch (e) {
        lastError = e;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 3000 * attempt));
        }
      }
    }
    if (!object) {
      console.error(
        `fetchItemWithAISdk: failed after 3 attempts for ${url}:`,
        lastError instanceof Error ? lastError.message : lastError,
      );
      return null;
    }
    return { object, ogImage: ogImage || null };
  } catch (error) {
    console.error(
      `fetchItemWithAISdk, Error processing url for ${url}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
};

// 下载图片，失败或可疑内容返回 null（不阻塞导入）
const downloadMaybe = async (
  url?: string | null,
): Promise<Buffer | null> => {
  if (!url) return null;
  try {
    const res = await fetch(url, { timeout: 30000 });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    // 只收位图；SVG/HTML/文本 一律不要（Sanity 图片资产会拒）
    if (!contentType.startsWith("image/")) return null;
    if (contentType.includes("svg")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) return null; // 过滤空图
    return buf;
  } catch {
    return null;
  }
};

// 上传 Sanity 图片资产，失败返回 null（不阻塞条目创建）
const uploadAssetMaybe = async (
  buf: Buffer | null,
  filename: string,
): Promise<string | null> => {
  if (!buf) return null;
  try {
    const asset = await client.assets.upload("image", buf, { filename });
    return asset._id;
  } catch (e) {
    console.error(`uploadAssetMaybe failed (${filename}):`, e instanceof Error ? e.message : e);
    return null;
  }
};

const normalizeLink = (u: string) => u.replace(/\/+$/, "");

export const importItems = async () => {
  console.log("importItems start");

  // get all categories and tags
  const categories = await client.fetch<Category[]>(`*[_type == "category"]`);
  const tags = await client.fetch<Tag[]>(`*[_type == "tag"]`);

  // 断点续跑：跳过已存在的链接
  const existingLinks = new Set(
    (
      await client.fetch<Array<{ link?: string }>>(`*[_type == "item"]{link}`)
    )
      .map((x) => x.link && normalizeLink(x.link))
      .filter(Boolean) as string[],
  );
  const pending = links.filter((u) => !existingLinks.has(normalizeLink(u)));
  console.log(
    `total: ${links.length}, existing: ${links.length - pending.length}, pending: ${pending.length}`,
  );

  const CONCURRENCY = Number(process.env.IMPORT_CONCURRENCY || 4);
  let ok = 0;
  let fail = 0;
  let idx = 0;

  const worker = async () => {
    while (idx < pending.length) {
      const my = idx++;
      const url = pending[my];
      const progress = `[${my + 1}/${pending.length}]`;
      try {
        const item = await fetchItem(url);
        if (!item || !item.name) {
          fail++;
          console.log(`${progress} FAIL(no-data) ${url}`);
          continue;
        }

        const itemCategories = findCategory(categories, item.categories);
        const itemTags = findTag(tags, item.tags);

        // 图片下载（缺失则跳过对应字段，不阻塞）
        const [iconBuffer, imageBuffer] = await Promise.all([
          downloadMaybe(item.icon),
          downloadMaybe(item.image),
        ]);

        const doc: Record<string, unknown> = {
          _type: "item",
          name: item.name,
          slug: { _type: "slug", current: slugify(item.name) },
          link: item.link,
          description: item.description,
          publishDate: new Date(),
          pricePlan: "free",
          freePlanStatus: "approved",
          introduction: item.introduction,
          categories: itemCategories.map((category, index) => ({
            _type: "reference",
            _ref: category._id,
            _key: index.toString(),
          })),
          tags: itemTags.map((tag, index) => ({
            _type: "reference",
            _ref: tag._id,
            _key: index.toString(),
          })),
        };

        if (iconBuffer) {
          const iconAssetId = await uploadAssetMaybe(
            iconBuffer,
            `${slugify(item.name)}_icon.png`,
          );
          if (iconAssetId) {
            doc.icon = {
              _type: "image",
              asset: { _type: "reference", _ref: iconAssetId },
              alt: `Logo of ${item.name}`,
            };
          }
        }
        if (imageBuffer) {
          const imageAssetId = await uploadAssetMaybe(
            imageBuffer,
            `${slugify(item.name)}_image.png`,
          );
          if (imageAssetId) {
            doc.image = {
              _type: "image",
              asset: { _type: "reference", _ref: imageAssetId },
              alt: `Screenshot of ${item.name}`,
            };
          }
        }

        await client.create(doc);
        ok++;
        console.log(
          `${progress} OK ${item.name} [${itemCategories.map((c) => c.name).join(", ") || "no-cat"}]`,
        );
      } catch (error) {
        fail++;
        console.error(
          `${progress} FAIL ${url}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  };

  await Promise.all(
    Array.from({ length: CONCURRENCY }, () => worker()),
  );

  console.log(`importItems done: ok=${ok}, fail=${fail}`);
};

const findCategory = (categories: Category[], names: string[]) => {
  return categories.filter((category: Category) =>
    names.includes(category.name),
  );
};

const findTag = (tags: Tag[], names: string[]) => {
  return tags.filter((tag: Tag) => names.includes(tag.name));
};

export const updateItems = async () => {
  const items = await client.fetch(`*[_type == "item"]`);

  for (const item of items) {
    const result = await client
      .patch(item._id)
      .set({
        // do what you want to update here
      })
      .commit();

    console.log(`Updated item ${item.name}:`, result);
  }

  console.log(`Updated ${items.length} items`);
};

// get operation from command line
const operation = process.argv[2];
// get url from command line
const url = process.argv[3];

// run operation based on command line argument
const runOperation = async () => {
  switch (operation) {
    case "remove":
      await removeItems();
      break;
    case "import":
      await importItems();
      break;
    case "update":
      await updateItems();
      break;
    case "fetch":
      await fetchItem(url);
      break;
    default:
      console.log(`
Available commands:
- remove: Remove all items
- import: Import all items
- update: Update all items
- fetch<url>: Fetch item info for the specified url with AI SDK and Microlink and return structured data
      `);
  }
};

// run operation
runOperation().catch(console.error);
