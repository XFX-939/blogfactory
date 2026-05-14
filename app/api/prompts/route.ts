import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_PROMPTS } from "@/lib/default-prompts";
import { getSupabaseAdmin } from "@/lib/supabase";

async function ensurePrompts() {
  const supabase = getSupabaseAdmin();
  const { data: existing, error } = await supabase.from("prompts").select("key");
  if (error) throw error;
  const existingKeys = new Set((existing || []).map((prompt) => prompt.key));
  const missing = DEFAULT_PROMPTS.filter((prompt) => !existingKeys.has(prompt.key));
  if (missing.length) {
    const { error: insertError } = await supabase.from("prompts").insert(missing);
    if (insertError) throw insertError;
  }
  return supabase;
}

export async function GET() {
  try {
    const supabase = await ensurePrompts();
    const { data, error } = await supabase
      .from("prompts")
      .select("*")
      .order("key", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ prompts: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Prompt 加载失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();
    const payload =
      body.action === "reset"
        ? DEFAULT_PROMPTS.map((prompt) => ({
            ...prompt,
            updated_at: new Date().toISOString()
          }))
        : body.prompts.map((prompt: { key: string; name: string; content: string }) => ({
            ...prompt,
            updated_at: new Date().toISOString()
          }));

    const { data, error } = await supabase
      .from("prompts")
      .upsert(payload, { onConflict: "key" })
      .select();
    if (error) throw error;
    return NextResponse.json({ prompts: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Prompt 保存失败" },
      { status: 500 }
    );
  }
}
