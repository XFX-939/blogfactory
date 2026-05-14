import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

function frontmatterValue(value: string | null | undefined) {
  return JSON.stringify(value || "");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;

    const markdown = `---
title: ${frontmatterValue(data.title)}
summary: ${frontmatterValue(data.summary)}
category: ${frontmatterValue(data.category)}
tags: ${JSON.stringify(data.tags || [])}
created_at: ${frontmatterValue(data.created_at)}
updated_at: ${frontmatterValue(data.updated_at)}
---

${data.content || ""}`;

    await supabase
      .from("articles")
      .update({ status: "exported", updated_at: new Date().toISOString() })
      .eq("id", id);

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
