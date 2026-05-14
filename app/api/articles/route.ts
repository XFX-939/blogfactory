import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const q = searchParams.get("q");

    let query = supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "all") query = query.eq("status", status);
    if (q) {
      query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%,category.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ articles: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "文章列表加载失败" },
      { status: 500 }
    );
  }
}
