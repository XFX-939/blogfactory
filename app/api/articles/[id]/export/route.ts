import { NextRequest, NextResponse } from "next/server";
import { getArticle, updateArticle } from "@/lib/store";

function frontmatterValue(value: string | null | undefined) {
  return JSON.stringify(value || "");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getArticle(id);
    if (!data) throw new Error("文章不存在。");

    const markdown = `---
title: ${frontmatterValue(data.title)}
summary: ${frontmatterValue(data.summary)}
category: ${frontmatterValue(data.category)}
tags: ${JSON.stringify(data.tags || [])}
created_at: ${frontmatterValue(data.created_at)}
updated_at: ${frontmatterValue(data.updated_at)}
---

${data.content || ""}`;

    await updateArticle(id, { status: "exported" });

    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${data.slug || id}.md"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Markdown 导出失败" },
      { status: 500 }
    );
  }
}
