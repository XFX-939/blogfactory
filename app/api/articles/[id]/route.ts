import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

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
    return NextResponse.json({ article: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "文章加载失败" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabaseAdmin();
    const updates = {
      ...body,
      slug: body.title ? slugify(body.title) : body.slug,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from("articles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ article: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "文章保存失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "文章删除失败" },
      { status: 500 }
    );
  }
}
