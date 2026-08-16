# AGENTS.md

此文件所以告往来代码代理（Codex、Cursor、OpenCode 等）者，览之可悉本库之要。

## 项目概览

Mkdirs 者，以 Next.js 十四（App Router）所造目录网站之模板也。内含 Sanity 内容管理、AI 助投、Stripe 支付、NextAuth 五代认证、博客暨邮件列表。包管理器用 **pnpm**（有 `pnpm-lock.yaml` 为凭）。

## 指令

- **开发服务**：`pnpm dev`
- **构建**：`pnpm build`（兼司类型之察——库中别无 typecheck 之令）
- **Lint**：`pnpm lint` —— **慎之：此令改写文件**（`biome check --write .` 也）
- **Lint 兼不安全之修**：`pnpm lint:fix`
- **格式化**：`pnpm format`（Biome）
- **生成 Sanity 类型**：`pnpm typegen` —— **凡改 `src/sanity/schemas/` 者，必随后行之**；所以再生 `sanity.types.ts`，此文件已入库受版本管理
- **邮件预览**：`pnpm email`（React Email 开发服务，居三千三百三十三端口）
- **条目批处理**：`pnpm item:import`、`pnpm item:fetch`、`pnpm item:update`、`pnpm item:remove`
- **诸实体批处理**（类目、标签、分组、条目）：`pnpm batch`（或 `pnpm batch:import`、`pnpm batch:update`、`pnpm batch:remove`）

### 测试

库中**无测试之框架，亦无测试之文件**。欲验所改，唯 `pnpm lint` 与 `pnpm build` 二途。

## 架构

### 路由之构（Next.js App Router）

`src/app/` 之下，有二顶层路由组：

- `(website)/` —— 正站也，内复分组：
  - `(public)/` —— 公开之页：首页、搜索、条目、类目、标签、合集、博客、定价
  - `(protected)/` —— 须认证之页：仪表盘、设置、投稿、编辑
  - `(newsletter)/` —— 邮件列表退订
  - `auth/` —— 登录、注册、重置密码、邮箱验核
- `(sanity)/` —— Sanity Studio 管理界面（挂于 `/studio`）

`src/app/api/` —— API 路由：曰 `auth`（NextAuth）、曰 `webhook`（Stripe）、曰 `og`（OG 图之生成）、曰 `draft` 与 `disable-draft`（Sanity 预览）、曰 `send-email`、曰 `upload-image`。

### 路由之守

`src/routes.ts` 定公开路由、认证路由及 API 认证前缀。`src/middleware.ts` 司门禁。已登录者访认证之页，则迁于 `/dashboard`。

### 数据之层

- **Sanity CMS** 乃内容正仓。模式藏于 `src/sanity/schemas/documents/`，以域分目：`directory/`（条目、类目、标签、合集、分组）、`blog/`（帖、作者）、`page/`、`order/`、`auth/`，及 `settings.ts`。
- **`src/data/`** 藏数据存取之函数（item.ts、blog.ts、collection.ts、user.ts、account.ts、order.ts、submission.ts 之类），服务端组件与动作咸用之。
- **`src/sanity/lib/`** 藏 Sanity 客户端器具及 GROQ 查询之助。
- **`sanity.types.ts`** 乃自 Sanity 模式所生之类型——勿手改之；欲其更新，行 `pnpm typegen`。

### 服务端动作

凡有变更，皆经 `src/actions/` 之服务端动作（一事一文件）：认证（登录、注册、重置）、条目操作（投稿、编辑、发布、下架）、支付（结账会话、客户门户）、设置、邮件列表及管理员诸务。

### 要集成

- **认证**：NextAuth 五代 beta，配置在 `src/auth.ts` 与 `src/auth.config.ts`。凭证兼 OAuth（Google、GitHub）。
- **支付**：Stripe 经由 `src/lib/stripe.ts`；webhook 处理在 `src/app/api/webhook/route.ts`。
- **AI**：Vercel AI SDK，供多家（Google、DeepSeek、OpenAI、xAI、OpenRouter），以环境变量 `DEFAULT_AI_PROVIDER` 择之。
- **邮件**：React Email 模板在 `emails/`，经 Resend 发送（`src/lib/mail.ts`）。
- **图片元数据**：Microlink（`@microlink/mql`），所以取网站截图与元数据。

### 配置

- `src/config/site.ts` —— 全站设置（名、址、述）
- `src/config/price.ts` —— 定价方案
- `src/config/dashboard.ts` —— 仪表盘导航
- `src/config/hero.ts`、`footer.ts`、`faq.ts`、`marketing.ts` —— 落地页诸节
- `src/lib/constants.ts` —— 共享常量
- `src/lib/schemas.ts` —— Zod 校验模式，表单与动作共用

### 样式

Tailwind CSS，配置在 `tailwind.config.ts`。UI 基元乃 Radix UI 系 shadcn/ui 组件，居 `src/components/ui/` —— **Biome 略过 `src/components/ui/*.tsx`**（生成之代码，勿手修其 lint 之弊）。组件以功能域分目于 `src/components/`（落地页有 `home/`、`home2/`、`home3/` 诸变体）。

## 环境

复制 `.env.example` 为 `.env`。要变量如下（名已核于 `.env.example`）：

- 站点：`NEXT_PUBLIC_APP_URL`
- Sanity：`NEXT_PUBLIC_SANITY_PROJECT_ID`、`NEXT_PUBLIC_SANITY_DATASET`、`SANITY_API_TOKEN`
- 认证：`AUTH_SECRET`（另有可选 `AUTH_GOOGLE_ID/SECRET`、`AUTH_GITHUB_ID/SECRET`；Docker 则加 `AUTH_TRUST_HOST=true`）
- Stripe：`STRIPE_API_KEY`、`STRIPE_WEBHOOK_SECRET`、`NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`、`NEXT_PUBLIC_STRIPE_SPONSOR_PRICE_ID`
- 邮件：`RESEND_API_KEY`、`RESEND_EMAIL_FROM`、`RESEND_EMAIL_ADMIN`、`RESEND_AUDIENCE_ID`
- AI：`DEFAULT_AI_PROVIDER`（取 `google`、`deepseek`、`openai`、`xai`、`openrouter` 之一）及其对应之 API key

## 陷阱

- `pnpm lint` 写修于文件——勿以为只读之察；欲只读，径用 `biome check .`。
- `scripts/` 批处理脚本经 `tsx` 运行，自理 `dotenv.config()`，直连 Sanity API——须 `.env` 齐备，且**将改动生产内容**。
- React Strict Mode 致邮箱验核表单（`new-verification-form`）开发模式下连发二次；此开发之独癖，非改之过（详见 `next.config.mjs` 中注释）。
- 生产构建剔除 `console.*` 诸调用（`next.config.mjs` 中 `removeConsole` 编译选项）。
- Next 图片设 `unoptimized: true` 且 `dangerouslyAllowSVG: true`（为 Sanity CDN 之 SVG）——添图片功能时宜留意。
- 库无 CI 流水线；规约唯 Biome 执之。
