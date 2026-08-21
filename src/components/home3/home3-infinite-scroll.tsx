"use client";

import { ItemCardSkeleton } from "@/components/item/item-card";
import ItemGridClient from "@/components/item/item-grid-client";
import type { ItemListQueryResult } from "@/sanity.types";
import { useCallback, useEffect, useRef, useState } from "react";

interface Home3InfiniteScrollProps {
  initialItems: ItemListQueryResult;
  /** 初始页码（支持直接带 ?page=N 进入时对齐后续追加） */
  initialPage: number;
  totalPages: number;
  category?: string;
  tag?: string;
  sort?: string;
  query?: string;
  filter?: string;
}

/**
 * 无限滚动条目网格
 * 监听滚动位置（IntersectionObserver 哨兵元素），
 * 接近底部时自动请求 /api/items 加载下一页并追加显示。
 */
export default function Home3InfiniteScroll({
  initialItems,
  initialPage,
  totalPages,
  category,
  tag,
  sort,
  query,
  filter,
}: Home3InfiniteScrollProps) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const hasMore = page < totalPages;

  const loadMore = useCallback(async () => {
    if (loadingRef.current || page >= totalPages) return;
    loadingRef.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (tag) params.set("tag", tag);
      if (sort) params.set("sort", sort);
      if (query) params.set("q", query);
      if (filter) params.set("f", filter);
      params.set("page", String(page + 1));

      const res = await fetch(`/api/items?${params.toString()}`);
      if (!res.ok) throw new Error(`请求失败: ${res.status}`);

      const data: { items: ItemListQueryResult } = await res.json();
      setItems((prev) => [...prev, ...data.items]);
      setPage((prev) => prev + 1);
    } catch (error) {
      console.error("loadMore error:", error);
      setFailed(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [page, totalPages, category, tag, sort, query, filter]);

  useEffect(() => {
    // 已加载完或正在加载时无需观察
    if (!hasMore) return;

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      // 提前 800px 触发，滚到底部前就开始加载
      { rootMargin: "800px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  return (
    <div>
      <ItemGridClient items={items} />

      {/* 底部哨兵：进入视口即触发加载下一页 */}
      {hasMore && <div ref={sentinelRef} className="h-px w-full" aria-hidden />}

      {/* 加载中骨架 */}
      {loading && (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: 骨架占位无稳定 id
            <ItemCardSkeleton key={index} />
          ))}
        </div>
      )}

      {/* 加载失败提示与重试 */}
      {failed && !loading && (
        <div className="mt-8 flex items-center justify-center">
          <button
            type="button"
            onClick={loadMore}
            className="cursor-pointer rounded-md border px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
          >
            加载失败，点击重试
          </button>
        </div>
      )}

      {/* 全部加载完成 */}
      {!hasMore && (
        <div className="mt-8 flex items-center justify-center text-sm text-muted-foreground">
          已经到底啦，共 {items.length} 个条目
        </div>
      )}
    </div>
  );
}
