import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const [{ count: total }, { count: draft }, { count: review }, { count: exported }, batches] =
      await Promise.all([
        supabase.from("articles").select("*", { count: "exact", head: true }),
        supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "review"),
        supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "exported"),
        supabase
          .from("article_batches")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5)
      ]);

    if (batches.error) throw batches.error;

    return NextResponse.json({
      total: total || 0,
      draft: draft || 0,
      review: review || 0,
      exported: exported || 0,
      batches: batches.data || []
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dashboard 加载失败" },
      { status: 500 }
    );
  }
}
