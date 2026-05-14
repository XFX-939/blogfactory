import { DEFAULT_PROMPTS } from "@/lib/default-prompts";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GeneratedArticle = {
  title: string;
  summary: string;
  category: string;
  tags: string[];
  content: string;
  cover_prompt?: string;
};

type QualityReview = {
  quality_score: number;
  ai_risk_score: number;
  sensitive_risk_score: number;
  strengths: string[];
  problems: string[];
  improvement_suggestions: string[];
};

export async function callLLM(messages: ChatMessage[], temperature = 0.7) {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    throw new Error("LLM_API_KEY 未配置，无法生成文章。");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM 请求失败：${response.status} ${text.slice(0, 500)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM 返回为空。");
  }
  return content as string;
}

export function parseJsonFromText<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI 返回不是合法 JSON。");
    return JSON.parse(match[0]) as T;
  }
}

export async function generateOutline(input: {
  topic: string;
  material: string;
  generationMode: string;
  articleType: string;
  tone: string;
  lengthType: string;
  globalPrompt: string;
}) {
  return callLLM([
    { role: "system", content: input.globalPrompt },
    {
      role: "user",
      content: `请先为博客文章生成详细大纲。

生成模式：${input.generationMode}
文章类型：${input.articleType}
文章长度：${input.lengthType}
语气：${input.tone}
选题：${input.topic}
资料：
${input.material || "无"}

要求：
1. 先给出核心观点。
2. 输出 Markdown 大纲。
3. 不要生成正文。`
    }
  ]);
}

export async function generateArticle(input: {
  topic: string;
  material: string;
  outline: string;
  generationPrompt: string;
  globalPrompt: string;
  articleType: string;
  tone: string;
  lengthType: string;
}) {
  const raw = await callLLM([
    { role: "system", content: input.globalPrompt },
    {
      role: "user",
      content: `${input.generationPrompt}

请根据以下信息生成文章，并只输出合法 JSON，不要 Markdown 代码块：
{
  "title": "文章标题",
  "summary": "150 字以内摘要",
  "category": "分类",
  "tags": ["标签1", "标签2"],
  "content": "完整 Markdown 正文",
  "cover_prompt": "适合封面图生成的中文 Prompt"
}

选题：${input.topic}
文章类型：${input.articleType}
文章长度：${input.lengthType}
语气：${input.tone}
大纲：
${input.outline}

资料：
${input.material || "无"}`
    }
  ]);

  return parseJsonFromText<GeneratedArticle>(raw);
}

export async function reviewArticle(input: {
  title: string;
  content: string;
  qualityPrompt: string;
  sensitivePrompt: string;
}) {
  const raw = await callLLM(
    [
      {
        role: "system",
        content: `${input.qualityPrompt}\n\n${input.sensitivePrompt}`
      },
      {
        role: "user",
        content: `请审核下面文章，并只输出合法 JSON：
{
  "quality_score": 0-100,
  "ai_risk_score": 0-100,
  "sensitive_risk_score": 0-100,
  "strengths": [],
  "problems": [],
  "improvement_suggestions": []
}

标题：${input.title}
正文：
${input.content}`
      }
    ],
    0.2
  );

  return parseJsonFromText<QualityReview>(raw);
}

export function promptFallback(key: string) {
  return DEFAULT_PROMPTS.find((prompt) => prompt.key === key)?.content || "";
}
