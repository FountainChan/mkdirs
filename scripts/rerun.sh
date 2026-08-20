#!/bin/bash
# opencli 截图重跑 v3：
# - open 后 URL 验证最多 5s（拿不到不判死，直接继续——页面可能已打开）
# - readyState 就绪轮询（最多 15s），拿不到状态也继续
# - 截图后验证文件 >10KB 才算成功，最多 2 次尝试
# - 文件保存确认后立即下一个
# 用法: bash scripts/rerun.sh
SESSION="vfszuehh"
SHOT_DIR="tmp-shots"
LIST="tmp-shots/retry-list.txt"
LOG="tmp-shots/rerun-log.txt"
MIN_SIZE=10240
READY_MAX_WAIT=15
URL_VERIFY_MAX=5

shot_one() {
  local safe="$1" url="$2"
  local file="$SHOT_DIR/$safe.png"
  local host
  host=$(echo "$url" | sed 's|https\?://||; s|/.*||; s|^www\.||')

  for attempt in 1 2; do
    opencli browser "$SESSION" close >/dev/null 2>&1
    sleep 1

    # open（不判断退出码）
    opencli browser "$SESSION" open "$url" >/dev/null 2>&1
    sleep 2

    # URL 验证：最多 5s，拿不到不判死
    local verified=0
    for v in 1 2 3 4 5; do
      local cur
      cur=$(opencli browser "$SESSION" get url 2>/dev/null | tr -d '"' | head -1)
      if echo "$cur" | grep -qi "$host"; then verified=1; break; fi
      if [ -n "$cur" ]; then break; fi   # 拿到了 URL 但不匹配才跳出；空结果继续重试获取
      sleep 1
    done
    # verified=0 或 URL 不匹配 → 不放弃，继续走截图流程（页面可能已开）

    # readyState 就绪轮询：最多 15s，拿不到状态也继续
    local waited=0 state
    while [ $waited -lt $READY_MAX_WAIT ]; do
      state=$(opencli browser "$SESSION" eval "document.readyState" 2>/dev/null | tr -d '"[:space:]')
      [ "$state" = "complete" ] && break
      sleep 1
      waited=$((waited+1))
    done

    # 渲染缓冲
    sleep 2

    # 截图
    rm -f "$file"
    opencli browser "$SESSION" screenshot "$file" >/dev/null 2>&1

    # 验证文件（保存确认后立即下一个）
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

echo "rerun done: ok=$ok fail=$fail total=$total"
echo "rerun done: ok=$ok fail=$fail total=$total" >> "$LOG"