# 截图、上传、下架脚本使用说明

> 适用：dir.vastnext.com（mkdirs 模板 + Sanity CMS）
> 四脚本配套使用：opencli 自动截图 / 人工介入截图 → 上传 Sanity → 下架问题站点

## 前置准备

1. **opencli** 已安装（`npm i -g opencli`），`opencli doctor` 显示 Daemon running、Extension connected
2. 浏览器 profile 已连接（当前 session 名 `vfszuehh`，用 `opencli doctor` 查看）
3. `.env` 中 `NEXT_PUBLIC_SANITY_PROJECT_ID`、`NEXT_PUBLIC_SANITY_DATASET`、`SANITY_API_TOKEN` 齐备
4. **截图清单** `scripts/fp-failed-detail.json`（item 元数据：name、link、_id）

## 脚本一：opencli 截图

**文件**：`scripts/screenshot-opencli.sh`（bash 脚本，Git Bash 直接跑）

**输入**：URL 列表文件（每行 `safeName|displayName|url`）
**输出**：`tmp-shots/<safeName>.png` + `tmp-shots/screenshot-log.txt`

### 用法

```bash
# 1. 准备 URL 列表（从 Sanity 查询缺图 item 生成，或手工编辑）
#    格式：safeName|displayName|url
#    safeName 仅含 a-z0-9-，用于文件名
echo "gencraft|gencraft|https://gencraft.com" > tmp-shots/retry-list.txt
echo "harmonai|harmonai|https://www.harmonai.org" >> tmp-shots/retry-list.txt

# 2. 跑截图
bash scripts/screenshot-opencli.sh tmp-shots/retry-list.txt

# 3. 指定其他 session
SESSION=otherprofile bash scripts/screenshot-opencli.sh tmp-shots/retry-list.txt
```

### 脚本逻辑（处理 opencli 不可靠退出码）

1. `opencli browser <session> open <url>` —— 不判断退出码（opencli dispatch 后连接抖动会返回非零，但页面实际已打开）
2. sleep 2s 后用 `get url` 验证当前页是否匹配目标 host —— 最多 5s 拿不到**不放弃**，直接继续（页面可能已开，只是查询抖动）
3. `eval document.readyState` 轮询直到 `complete`（最多 15s），拿不到也继续
4. sleep 2s 渲染缓冲
5. `screenshot <file>` 截图
6. 验证文件存在且 >10KB（防白页/反爬空壳），不达标重试
7. 每条最多 2 次尝试，失败写日志 `GIVEUP`

### 日志格式（screenshot-log.txt）

```
gencraft|OK|522664|ready=complete|verified=1|attempt1
replika|too-small(4324)|attempt1
replika|too-small(4324)|attempt2
replika|GIVEUP
```

筛选失败项重跑：
```bash
grep "GIVEUP\|too-small\|no-file" tmp-shots/screenshot-log.txt | cut -d'|' -f1 > tmp-shots/retry-list.txt
bash scripts/screenshot-opencli.sh tmp-shots/retry-list.txt
```

### 人工介入 CF 挑战

Cloudflare 挑战页（`tmp-shots/CloudflareBlock/`）需要人工完成：

```bash
# 1. opencli 打开目标页（headed 模式）
opencli browser vfszuehh open "https://example.com"

# 2. 切换到 headed 模式（或在已连接的 Chrome 里手动操作）
#    用 --headed 或连接已运行的 Chrome（--auto-connect）
opencli browser vfszuehh --headed open "https://example.com"

# 3. 在弹出的浏览器窗口里手动完成 CF 挑战

# 4. 挑战通过后截图
opencli browser vfszuehh screenshot tmp-shots/example.png

# 5. 关闭 session
opencli browser vfszuehh close
```

## 脚本二：人工介入截图（CF 挑战/指定条目）

**文件**：`scripts/screenshot-manual.sh`（bash 脚本，**必须在自己的 Git Bash 终端跑**——需要按 Enter 交互）

**用途**：Cloudflare 挑战页或需要人工等待的场景。脚本打开页面 → **暂停等你按 Enter**（你在 Chrome 里完成 CF 挑战/等加载）→ 截图 → 下一条。

### 三种输入模式

```bash
# 1. --dir：遍历目录下所有 .png 文件名（重截该目录的站点）
bash scripts/screenshot-manual.sh --dir tmp-shots/CloudflareBlock

# 2. --name：直接指定名称（可多个）
bash scripts/screenshot-manual.sh --name "gencraft" "replika" "chat2course"

# 3. --file：从文件读，每行自动识别 URL 或纯名称
#    https://dir.vastnext.com/item/marketingblocks-ai  → URL，取末段 slug
#    wordhero                                        → 纯名称
bash scripts/screenshot-manual.sh --file list.txt

# 可选：--session 指定 opencli session（默认 vfszuehh）
bash scripts/screenshot-manual.sh --file list.txt --session vfszuehh
```

### 执行流程

1. 逐行识别输入（URL 取末段 slug / 纯名称），统一 slug 化去重
2. 映射查找：`fp-failed-detail.json` → Sanity 全量（name slug + item slug 双键）
3. **打开浏览器前打印清单预览**（名称 + URL + 总数）
4. 逐条：opencli 打开 → `read` 等 Enter → 截图 → 验证 >10KB → 下一条

### 清单预览效果

```
==========================================
 待截图清单（共 3 条）
==========================================
 [1] marketingblocks ai  (https://marketingblocks.ai)
 [2] wordhero  (https://wordhero.co)
 [3] vocal remover  (https://vocalremover.org)
==========================================
```

### 关键实现细节（Git Bash 踩坑）

- 所有 `opencli` 命令带 `</dev/null`：防止 opencli 劫持 stdin 吃掉 while 循环的列表行（曾导致只跑 2 条就停）
- `read ... </dev/tty`：从终端读 Enter，不读列表文件（曾导致不等输入直接跳）
- `find -exec basename`：避免管道子 shell 写文件被覆盖

### 产出

- `tmp-shots/<safeName>.png`
- `tmp-shots/manual-screenshot-log.txt`（OK / too-small / no-file）

## 脚本三：上传截图到 Sanity

**文件**：`scripts/upload-screenshots.mjs`（Node.js + next-sanity）

**输入**：`tmp-shots/` 根目录所有 `.png`（跳过 `blank/`、`CloudflareBlock/`、`Remove/` 子目录和 `mapping.json`、`uploaded.json`）
**输出**：更新 Sanity item 的 image 字段 + `tmp-shots/uploaded.json`（断点续跑记录）

### 用法

```bash
# 先 dry-run 确认映射
node scripts/upload-screenshots.mjs --dry-run

# 正式上传
node scripts/upload-screenshots.mjs
```

### 文件名 → item 映射

文件名 `safe-name.png` → 通过 `scripts/fp-failed-detail.json` 的 `name` 字段做 slug 匹配 → 找到对应 `_id` → `patch(_id).set({ image: {...} })`

**断点续跑**：已上传的文件名记入 `tmp-shots/uploaded.json`，重跑自动跳过。

### 上传后人工分类

上传完后，把有问题的图手工归档：
- `tmp-shots/blank/` —— 空白页（反爬/JS 渲染失败），需重跑或换源
- `tmp-shots/CloudflareBlock/` —— CF 挑战页，需人工介入
- `tmp-shots/Remove/` —— 站点不通/下线，**交给下架脚本处理**

## 脚本四：下架 item

**文件**：`scripts/unpublish-items.mjs`（Node.js + next-sanity）

**机制**：`publishDate` 置 `null`（mkdirs 的下架开关，`src/actions/unpublish.ts` 同款逻辑）
**记录**：追加到 `docs/unpublished-sites.md`（可追溯）

### 用法（三种输入方式）

```bash
# 1. 目录：把目录下所有 .png 文件名作为下架清单
node scripts/unpublish-items.mjs tmp-shots/Remove/

# 2. 文本文件：每行一个名称（safe-name 或 displayName 都行）
node scripts/unpublish-items.mjs tmp-shots/remove-list.txt

# 3. 命令行直接传名称
node scripts/unpublish-items.mjs "gencraft" "replika" "inworld"
```

### 日志（docs/unpublished-sites.md）

每次运行追加一个批次：

```markdown
## 2026-08-20 批次（4 条）

| 名称 | 官网 | 原因 |
|---|---|---|
| applaime | https://applaime.com/?ref=saasaitools | screenshot-Remove/站点不通或下线 |
| microsoft copilot | https://copilot.microsoft.com | screenshot-Remove/站点不通或下线 |
```

## 完整工作流

```bash
# 1. 截图（opencli 真实浏览器渲染）
bash scripts/screenshot-opencli.sh tmp-shots/retry-list.txt

# 2. 人工分类有问题的图
mv tmp-shots/replika.png tmp-shots/blank/        # 白页
mv tmp-shots/some-cf-site.png tmp-shots/CloudflareBlock/  # CF 挑战
mv tmp-shots/dead-site.png tmp-shots/Remove/     # 站点不通

# 3. 上传 OK 的图
node scripts/upload-screenshots.mjs

# 4. 下架 Remove 目录的站点
node scripts/unpublish-items.mjs tmp-shots/Remove/

# 5. （可选）重跑 blank 目录的站点
ls tmp-shots/blank/ | sed 's/.png//' > tmp-shots/blank-list.txt
# 转成 retry-list 格式（safeName|name|url）后重跑脚本一
```

## 复用场景

- **新加站点**：把 URL 加到 `scripts/fp-failed-detail.json` 或新建清单 → 跑脚本一截图 → 脚本二上传
- **重试失败项**：从日志筛 GIVEUP/too-small 生成新清单 → 重跑脚本一
- **批量下架**：任意名称清单 → 脚本三下架
- **恢复发布**：手动 `patch(_id).set({ publishDate: new Date() })`（参考 `scripts/tmp-republish.mjs`）

## 关键设计点

1. **opencli 退出码不可靠**：脚本一不信任 open/screenshot 的退出码，用 `get url` 验证页面状态 + 文件大小校验作双重保险
2. **断点续跑**：脚本二 `uploaded.json`、脚本三幂等（已下架的再下架无副作用）
3. **可追溯**：下架记录全进 `docs/unpublished-sites.md`，截图日志进 `tmp-shots/screenshot-log.txt`
4. **白页拦截**：10KB 阈值拦掉反爬空壳页（纯白 PNG 约 4KB），逼真截图至少几十 KB