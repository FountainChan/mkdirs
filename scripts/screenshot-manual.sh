#!/bin/bash
# opencli 两段式人工介入截图脚本
# 支持三种输入模式：
#   --dir <目录>    遍历目录下所有 .png 文件名
#   --name <名称>   直接指定 item 名称（可多个，空格分隔）
#   --file <文件>   从文件读取（每行一个，支持 URL 或纯名称，自动识别）
# 自动 opencli 打开页面 → 等待人工完成 CF 挑战 → 按 Enter 截图 → 下一条
#
# 用法：
#   bash scripts/screenshot-manual.sh --dir tmp-shots/CloudflareBlock
#   bash scripts/screenshot-manual.sh --name "gencraft" "replika"
#   bash scripts/screenshot-manual.sh --file list.txt
#   bash scripts/screenshot-manual.sh --file list.txt --session vfszuehh
#
# --file 输入格式（每行，自动识别）：
#   https://dir.vastnext.com/item/marketingblocks-ai   → 取 URL 末段作为 slug
#   wordhero                                          → 直接作为名称
#
# 产出：
#   tmp-shots/<safeName>.png
#   tmp-shots/manual-screenshot-log.txt

set -u
SESSION="vfszuehh"
DIR=""
FILE=""
NAMES=()
MIN_SIZE=10240

while [ $# -gt 0 ]; do
  case "$1" in
    --dir) DIR="$2"; shift 2 ;;
    --file) FILE="$2"; shift 2 ;;
    --name) shift; while [ $# -gt 0 ] && [[ "$1" != --* ]]; do NAMES+=("$1"); shift; done ;;
    --session) SESSION="$2"; shift 2 ;;
    *) echo "unknown arg: $1"; exit 1 ;;
  esac
done

if [ -z "$DIR" ] && [ -z "$FILE" ] && [ ${#NAMES[@]} -eq 0 ]; then
  echo "用法: bash scripts/screenshot-manual.sh --dir <目录> | --name <名称...> | --file <文件> [--session <session>]"
  exit 1
fi

# 构建待截图 safe-name 列表
LIST_FILE=$(mktemp)
if [ -n "$DIR" ]; then
  [ ! -d "$DIR" ] && echo "目录不存在: $DIR" && exit 1
  find "$DIR" -maxdepth 1 -name "*.png" -exec basename {} .png \; | sort > "$LIST_FILE"
elif [ -n "$FILE" ]; then
  [ ! -f "$FILE" ] && echo "文件不存在: $FILE" && exit 1
  # 智能识别：URL 取末段 slug，否则当名称；统一 slug 化
  while IFS= read -r line; do
    line=$(echo "$line" | xargs)
    [ -z "$line" ] && continue
    if echo "$line" | grep -qiE '^https?://'; then
      # URL：取路径末段（去 query/尾部斜杠）
      slug=$(echo "$line" | sed 's/[?#].*$//; s/\/$//; s/.*\///')
      [ -n "$slug" ] && echo "$slug" >> "$LIST_FILE"
    else
      echo "$line" >> "$LIST_FILE"
    fi
  done < "$FILE"
else
  for n in "${NAMES[@]}"; do
    echo "$n" >> "$LIST_FILE"
  done
fi

# 统一 slug 化 + 去重
SLUG_FILE=$(mktemp)
while IFS= read -r raw; do
  [ -z "$raw" ] && continue
  echo "$raw" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\+/-/g; s/^-\|-$//g' >> "$SLUG_FILE"
done < "$LIST_FILE"
sort -u "$SLUG_FILE" > "$SLUG_FILE.tmp" && mv "$SLUG_FILE.tmp" "$SLUG_FILE"
rm -f "$LIST_FILE"

# safe-name → name|url 映射（fp-failed-detail.json + Sanity 全量兜底）
MAP_FILE=$(mktemp)
node --input-type=module -e "
import 'dotenv/config';
import { createClient } from 'next-sanity';
import { readFileSync } from 'node:fs';
const client = createClient({ projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID, dataset: process.env.NEXT_PUBLIC_SANITY_DATASET, apiVersion: '2024-08-01', useCdn: false, token: process.env.SANITY_API_TOKEN });
const detail = JSON.parse(readFileSync('scripts/fp-failed-detail.json', 'utf-8'));
const map = new Map();
for (const d of detail) {
  const safe = d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  map.set(safe, safe + '|' + d.name + '|' + (d.link || '').replace(/\?.*$/, ''));
}
const all = await client.fetch('*[_type == \"item\"]{name, \"slug\": slug.current, link}');
for (const a of all) {
  const safe = a.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (!map.has(safe)) {
    map.set(safe, safe + '|' + a.name + '|' + (a.link || '').replace(/\?.*$/, ''));
  }
  // slug 也能命中（如 URL 提取的 marketingblocks-ai）
  if (a.slug && !map.has(a.slug)) {
    map.set(a.slug, a.slug + '|' + a.name + '|' + (a.link || '').replace(/\?.*$/, ''));
  }
}
process.stdout.write([...map.values()].join('\n'));
" 2>/dev/null > "$MAP_FILE"

LOG="tmp-shots/manual-screenshot-log.txt"
mkdir -p tmp-shots

# 打印清单预览（名称 + 总数）
TOTAL=$(wc -l < "$SLUG_FILE" | tr -d ' ')
echo "=========================================="
echo " 待截图清单（共 ${TOTAL} 条）"
echo "=========================================="
n=0
while IFS= read -r s; do
  [ -z "$s" ] && continue
  n=$((n+1))
  line=$(grep "^$s|" "$MAP_FILE" 2>/dev/null | head -1)
  if [ -n "$line" ]; then
    name=$(echo "$line" | cut -d'|' -f2)
    url=$(echo "$line" | cut -d'|' -f3)
    echo " [$n] $name  ($url)"
  else
    echo " [$n] $s  (no-mapping, 将跳过)"
  fi
done < "$SLUG_FILE"
echo "=========================================="

# 逐条执行
ok=0; fail=0; skip=0
while IFS= read -r safe; do
  [ -z "$safe" ] && continue
  line=$(grep "^$safe|" "$MAP_FILE" 2>/dev/null | head -1)
  if [ -z "$line" ]; then skip=$((skip+1)); continue; fi
  name=$(echo "$line" | cut -d'|' -f2)
  url=$(echo "$line" | cut -d'|' -f3)

  opencli browser "$SESSION" close >/dev/null 2>&1 </dev/null
  opencli browser "$SESSION" open "$url" >/dev/null 2>&1 </dev/null

  read -r -p "[$name] ($url)
    页面已打开，完成 CF 挑战后按 Enter 截图..." _ </dev/tty
  echo ""

  out="tmp-shots/$safe.png"
  opencli browser "$SESSION" screenshot "$out" >/dev/null 2>&1 </dev/null
  sleep 1
  if [ -f "$out" ]; then
    size=$(stat -c%s "$out" 2>/dev/null || wc -c < "$out")
    if [ "$size" -gt "$MIN_SIZE" ]; then
      ok=$((ok+1))
      echo "    OK ($((size/1024))KB) -> $out"
      echo "$safe|OK|$size" >> "$LOG"
    else
      echo "    WARN too-small ($size bytes)"
      echo "$safe|too-small|$size" >> "$LOG"
    fi
  else
    fail=$((fail+1))
    echo "    FAIL 截图失败"
    echo "$safe|no-file" >> "$LOG"
  fi
done < "$SLUG_FILE"
rm -f "$SLUG_FILE" "$MAP_FILE"

opencli browser "$SESSION" close >/dev/null 2>&1 </dev/null
echo ""
echo "done: total=$TOTAL ok=$ok fail=$fail skip=$skip"
echo "日志: $LOG"