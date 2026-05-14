import { NextRequest, NextResponse } from "next/server";
import { listArticles } from "@/lib/store";
import type { ArticleStatus } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as "all" | ArticleStatus | null;
    const q = searchParams.get("q");
    return NextResponse.json({ articles: await listArticles({ status, q }) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "文章列表加载失败" },
      { status: 500 }
    );
  }
}
