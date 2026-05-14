import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_PROMPTS } from "@/lib/default-prompts";
import {
  generateArticle,
  generateOutline,
  promptFallback,
  reviewArticle
} from "@/lib/llm";
import { getSupabaseAdmin } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

async function logStep(input: {
  batch_id: string;
  article_id?: string;
  step: string;
  status: string;
  message: string;
  raw_response?: string;
}) {
  const supabase = getSupabaseAdmin();
  await supabase.from("generation_logs").insert(input);
}

async function loadPromptMap() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("prompts").select("key, content");
  const map = new Map<string, string>();
  for (const prompt of DEFAULT_PROMPTS) map.set(prompt.key, prompt.content);
  for (const prompt of data || []) map.set(prompt.key, prompt.content);
  return map;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = getSupabaseAdmin();
  const batchId = body.batch_id as string;
  const topic = body.topic as string;

  try {
    const prompts = await loadPromptMap();
    const common = {
      topic,
      material: body.material || "",
      generationMode: body.generation_mode,
      articleType: body.article_type,
      tone: body.tone,
      lengthType: body.length_type,
      globalPrompt: prompts.get("global_style") || promptFallback("global_style")
    };

    await logStep({
      batch_id: batchId,
      step: "生成大纲",
      status: "running",
      message: `开始生成《${topic}》的大纲`
    });
    const outline = await generateOutline(common);
    await logStep({
      batch_id: batchId,
      step: "生成大纲",
      status: "success",
      message: "大纲生成完成",
      raw_response: outline
    });

    await logStep({
      batch_id: batchId,
      step: "生成正文",
      status: "running",
      message: `开始生成《${topic}》正文`
    });
    const article = await generateArticle({
      ...common,
      outline,
      generationPrompt:
        prompts.get("article_generation") || promptFallback("article_generation")
    });
    await logStep({
      batch_id: batchId,
      step: "生成正文",
      status: "success",
      message: "正文生成完成",
      raw_response: JSON.stringify(article)
    });

    await logStep({
      batch_id: batchId,
      step: "质量评分",
      status: "running",
      message: "开始质量评分和敏感信息检查"
    });
    const review = await reviewArticle({
      title: article.title,
      content: article.content,
      qualityPrompt:
        prompts.get("quality_review") || promptFallback("quality_review"),
      sensitivePrompt:
        prompts.get("sensitive_check") || promptFallback("sensitive_check")
    });
    await logStep({
      batch_id: batchId,
      step: "质量评分",
      status: "success",
      message: "质量评分完成",
      raw_response: JSON.stringify(review)
    });

    await logStep({
      batch_id: batchId,
      step: "保存",
      status: "running",
      message: "保存文章到 Supabase"
    });
    const { data, error } = await supabase
      .from("articles")
      .insert({
        title: article.title || topic,
        slug: slugify(article.title || topic),
        summary: article.summary,
        content: article.content,
        category: article.category,
        tags: article.tags || [],
        article_type: body.article_type,
        tone: body.tone,
        length_type: body.length_type,
        status: "review",
        quality_score: review.quality_score,
        ai_risk_score: review.ai_risk_score,
        sensitive_risk_score: review.sensitive_risk_score,
        cover_prompt: article.cover_prompt || "",
        source_input: [topic, body.material].filter(Boolean).join("\n\n")
      })
      .select()
      .single();
    if (error) throw error;

    await logStep({
      batch_id: batchId,
      article_id: data.id,
      step: "保存",
      status: "success",
      message: "文章保存完成"
    });

    return NextResponse.json({
      article: data,
      review,
      message: "文章生成成功"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "文章生成失败";
    await logStep({
      batch_id: batchId,
      step: "失败",
      status: "failed",
      message: `《${topic}》生成失败：${message}`
    }).catch(() => undefined);

    return NextResponse.json({ error: message, topic }, { status: 500 });
  }
}
