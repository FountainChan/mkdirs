import { getItems } from "@/data/item";
import { DEFAULT_SORT, SORT_FILTER_LIST } from "@/lib/constants";
import { NextResponse } from "next/server";

/**
 * 分页获取条目列表，供无限滚动组件请求下一页
 * 参数与 /home3 页面查询参数一致：category/tag/sort/q/f/page
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? undefined;
    const tag = searchParams.get("tag") ?? undefined;
    const query = searchParams.get("q") ?? undefined;
    const filter = searchParams.get("f") ?? undefined;
    const sort = searchParams.get("sort") ?? undefined;
    const page = Number(searchParams.get("page")) || 1;

    const { sortKey, reverse } =
      SORT_FILTER_LIST.find((item) => item.slug === sort) || DEFAULT_SORT;

    const { items, totalCount } = await getItems({
      category,
      tag,
      sortKey,
      reverse,
      query,
      filter,
      currentPage: page,
      hasSponsorItem: false,
    });

    return NextResponse.json({ items, totalCount });
  } catch (error) {
    console.error("api/items error:", error);
    return NextResponse.json({ error: "获取条目列表失败" }, { status: 500 });
  }
}
