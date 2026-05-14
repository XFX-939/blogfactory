import { NextRequest, NextResponse } from "next/server";
import { createBatch, updateBatch } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const batch = await createBatch({
      name: body.name || `批量生成 ${new Date().toLocaleString("zh-CN")}`,
      input_topics: body.input_topics,
      input_material: body.input_material,
      generation_mode: body.generation_mode,
      article_type: body.article_type,
      tone: body.tone,
      length_type: body.length_type,
      status: "running",
      total_count: body.total_count || 0,
      success_count: 0,
      failed_count: 0
    });
    return NextResponse.json({ batch });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "批次创建失败" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const batch = await updateBatch(id, updates);
    return NextResponse.json({ batch });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "批次更新失败" },
      { status: 500 }
    );
  }
}
