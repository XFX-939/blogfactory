import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("article_batches")
      .insert({
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
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ batch: data });
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
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("article_batches")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", body.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ batch: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "批次更新失败" },
      { status: 500 }
    );
  }
}
