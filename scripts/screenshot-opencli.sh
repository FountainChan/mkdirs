#!/bin/bash
# opencli 浏览器截图脚本：读 URL 列表，逐条打开页面、轮询就绪、截图、验证文件
#
# 输入列表格式（每行）：safeName|displayName|url
#   safeName: 用于文件名（仅 a-z0-9-），生成的截图文件为 tmp-shots/<safeName>.png
#   displayName: 仅用于日志显示
#   url: 要截图的网址
#
# 用法：
#   bash scripts/screenshot-opencli.sh <list-file>           # 默认 session=vfszuehh
#   SESSION=myname bash scripts/screenshot-opencli.sh list.txt
#
# 产出：
#   tmp-shots/<safeName>.png     成功的截图
#   tmp-shots/screenshot-log.txt  每条结果（OK / too-small / no-file / GIVEUP）
#
# 失败处理：每条最多 2 次尝试；URL 验证失败不放弃（opencli 退出码不可靠）；
# 截图后验证文件 >10KB 才算成功（防白页）；失败写入日志，最终可用日志筛选重试。

set -u
SESSION="${SESSION:-vfszuehh}"
SHOT_DIR="${SHOT_DIR:-tmp-shots}"
LOG="$SHOT_DIR/screenshot-log.txt"
MIN_SIZE=10240
READY_MAX_WAIT=15

mkdir -p "$SHOT_DIR"

shot_one() {
  local safe="$1" url="$2"
  local file="$SHOT_DIR/$safe.png"
  local host
  host=$(echo "$url" | sed 's|https\?://||; s|/.*||; s|^www\.||')

  for attempt in 1 2; do
    opencli browser "$SESSION" close >/dev/null 2>&1
    sleep 1

    # open（不判断退出码——opencli 命令退出码不可靠，dispatch 后连接抖动会返回非零但页面已开）
    opencli browser "$SESSION" open "$url" >/dev/null 2>&1
    sleep 2

    # URL 验证：最多 5s，拿不到不判死（页面可能已开，只是查询抖动）
    local verified=0 cur
    for v in 1 2 3 4 5; do
      cur=$(opencli browser "$SESSION" get url 2>/dev/null | tr -d '"' | head -1)
      if echo "$cur" | grep -qi "$host"; then verified=1; break; fi
      [ -n "$cur" ] && break
      sleep 1
    done

    # readyState 就绪轮询：最多 15s，拿不到状态也继续截图
    local waited=0 state
    while [ $waited -lt $READY_MAX_WAIT ]; do
      state=$(opencli browser "$SESSION" eval "document.readyState" 2>/dev/null | tr -d '"[:space:]')
      [ "$state" = "complete" ] && break
      sleep 1
      waited=$((waited+1))
    done
    sleep 2  # 渲染缓冲

    # 截图
    rm -f "$file"
    opencli browser "$SESSION" screenshot "$file" >/dev/null 2>&1

    # 验证文件存在 + 大小
    if [ -f "$file" ]; then
      local size
      size=$(stat -c%s "$file" 2>/dev/null || wc -c < "$file")
      if [ "$size" -gt "$MIN_SIZE" ]; then
        echo "$safe|OK|$size|ready=${state:-na}|verified=$verified|attempt$attempt" >> "$LOG"
        opencli browser "$SESSION" close >/dev/null 2>&1
        return 0
      else
        echo "$safe|too-small($size)|attempt$attempt" >> "$LOG"
      fi
    else
      echo "$safe|no-file|attempt$attempt" >> "$LOG"
    fi
    sleep 2
  done

  opencli browser "$SESSION" close >/dev/null 2>&1
  echo "$safe|GIVEUP" >> "$LOG"
  return 1
}

LIST="${1:-tmp-shots/retry-list.txt}"
> "$LOG"
ok=0; fail=0; total=0
while IFS='|' read -r safe name url; do
  [ -z "$safe" ] && continue
  total=$((total+1))
  if shot_one "$safe" "$url"; then
    ok=$((ok+1))
    echo "[$total] OK $name"
  else
    fail=$((fail+1))
    echo "[$total] FAIL $name"
  fi
done < "$LIST"

echo "screenshot done: ok=$ok fail=$fail total=$total"
echo "screenshot done: ok=$ok fail=$fail total=$total" >> "$LOG"