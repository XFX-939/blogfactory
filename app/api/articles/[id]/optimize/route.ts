import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";
import { getArticle } from "@/lib/store";

const actionPrompts: Record<string, string> = {
  title: "请为这篇文章优化标题，给出 5 个克制、清晰、不营销的中文标题，只输出列表。",
  humanize: "请重写这篇文章中 AI 味明显、空泛、模板化的表达，保留原观点和事实边界，只输出优化后的 Markdown 正文。",
  viewpoint: "请在不编造具体事实的前提下，增加作者个人观点、取舍判断和边界意识，只输出优化后的 Markdown 正文。",
  case: "请增加泛化的工程案例和研发现场感，避免客户名、公司名、项目代号和未公开数据，只输出优化后的 Markdown 正文。",
  moments: "请把这篇文章压缩成适合朋友圈发布的中文文案，克制、有观点、不鸡汤。",
  xiaohongshu: "请把这篇文章转换成小红书文案，保持专业和真实，不使用夸张营销语。",
  cover: "请为这篇文章生成一个封面图 Prompt，画面专业、干净、有工程师工具感，只输出 Prompt。"
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = await request.json();
    const prompt = actionPrompts[action];
    if (!prompt) throw new Error("未知优化动作。");

    const data = await getArticle(id);
    if (!data) throw new Error("文章不存在。");

    const result = await callLLM([
      {
        role: "system",
        content:
          "你是一名中文技术博客编辑，重视事实边界、工程现场感和克制表达。"
      },
      {
        role: "user",
        content: `${prompt}

标题：${data.title}
摘要：${data.summary || ""}
正文：
${data.content || ""}`
      }
    ]);

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 优化失败" },
      { status: 500 }
    );
  }
}
