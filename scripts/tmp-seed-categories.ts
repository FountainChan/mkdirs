/**
 * 一次性脚本：为 AI 工具冷启动重建分类/标签
 * - 删除未被引用的旧分类（Portfolios / Open Source / Resources）
 * - 按 xlsx 统一类目创建 12 个新分类（英文）
 * - 提升 Developer Tools / AI Tools 优先级（AI Tools 兜底"其他"）
 * - 补充 AI 工具向标签
 * 用法：npx tsx scripts/tmp-seed-categories.ts
 */
import { slugify } from "@/lib/utils";
import { createClient } from "@sanity/client";
import dotenv from "dotenv";
dotenv.config();

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2024-08-01",
  useCdn: false,
  perspective: "published",
  token: process.env.SANITY_API_TOKEN,
});

const newCategories = [
  { name: "AI Chat", priority: 313, description: "AI chat assistants and conversational agents" },
  { name: "Image Generation", priority: 312, description: "AI image creation and editing tools" },
  { name: "Video Generation", priority: 311, description: "AI video creation and editing tools" },
  { name: "Design Tools", priority: 310, description: "AI-powered design and prototyping tools" },
  { name: "Writing Tools", priority: 309, description: "AI writing assistants and copywriting tools" },
  { name: "Audio Tools", priority: 308, description: "AI audio, music and voice tools" },
  { name: "Marketing Tools", priority: 306, description: "AI marketing, SEO and growth tools" },
  { name: "Search and Research", priority: 305, description: "AI search engines and research assistants" },
  { name: "Office Tools", priority: 304, description: "AI productivity and office tools" },
  { name: "Data Tools", priority: 303, description: "AI data analysis and processing tools" },
  { name: "Entertainment", priority: 302, description: "AI entertainment and creative play tools" },
  { name: "Translation", priority: 301, description: "AI translation and localization tools" },
];

const patchPriority = [
  { name: "Developer Tools", priority: 307 },
  { name: "AI Tools", priority: 300 },
];

const deleteCategories = ["Portfolios", "Open Source", "Resources"];

const newTags = [
  { name: "Chatbot", description: "Conversational AI tools" },
  { name: "Image", description: "Image related AI tools" },
  { name: "Video", description: "Video related AI tools" },
  { name: "Audio", description: "Audio related AI tools" },
  { name: "Coding", description: "Coding and developer tools" },
  { name: "Marketing", description: "Marketing tools" },
  { name: "SEO", description: "SEO and growth tools" },
  { name: "Productivity", description: "Productivity boosters" },
  { name: "No Code", description: "No-code tools" },
  { name: "Free Trial", description: "Offers free trial" },
  { name: "Automation", description: "Workflow automation tools" },
];

const seed = async () => {
  const cats = await client.fetch<Array<{ _id: string; name: string }>>(`*[_type == "category"]`);

  // 删除未被条目引用的旧分类
  for (const name of deleteCategories) {
    const cat = cats.find((c) => c.name === name);
    if (!cat) continue;
    const refCount = await client.fetch(`count(*[_type == "item" && references($id)])`, { id: cat._id });
    if (refCount === 0) {
      await client.delete(cat._id);
      console.log("deleted category:", name);
    } else {
      console.log("kept category (referenced):", name, "refs:", refCount);
    }
  }

  // 优先级调整
  for (const p of patchPriority) {
    const cat = cats.find((c) => c.name === p.name);
    if (cat) {
      await client.patch(cat._id).set({ priority: p.priority }).commit();
      console.log("patched priority:", p.name, "->", p.priority);
    }
  }

  // 新建分类（幂等：跳过同名）
  for (const c of newCategories) {
    if (cats.some((x) => x.name === c.name)) {
      console.log("category exists, skip:", c.name);
      continue;
    }
    await client.create({
      _type: "category",
      name: c.name,
      slug: { _type: "slug", current: slugify(c.name) },
      description: c.description,
      priority: c.priority,
    });
    console.log("category created:", c.name);
  }

  // 新建标签（幂等）
  const tags = await client.fetch<Array<{ _id: string; name: string }>>(`*[_type == "tag"]`);
  for (const t of newTags) {
    if (tags.some((x) => x.name === t.name)) continue;
    await client.create({
      _type: "tag",
      name: t.name,
      slug: { _type: "slug", current: slugify(t.name) },
      description: t.description,
    });
    console.log("tag created:", t.name);
  }

  console.log("seed done");
};

seed();
