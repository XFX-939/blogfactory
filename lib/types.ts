export type ArticleStatus =
  | "draft"
  | "review"
  | "approved"
  | "exported"
  | "discarded";

export type Article = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  category: string | null;
  tags: string[] | null;
  article_type: string | null;
  tone: string | null;
  length_type: string | null;
  status: ArticleStatus;
  quality_score: number | null;
  ai_risk_score: number | null;
  sensitive_risk_score: number | null;
  cover_prompt: string | null;
  source_input: string | null;
  created_at: string;
  updated_at: string;
};

export type Batch = {
  id: string;
  name: string;
  input_topics: string | null;
  input_material: string | null;
  generation_mode: string | null;
  article_type: string | null;
  tone: string | null;
  length_type: string | null;
  status: string | null;
  total_count: number | null;
  success_count: number | null;
  failed_count: number | null;
  created_at: string;
  updated_at: string;
};

export const statusLabels: Record<ArticleStatus, string> = {
  draft: "草稿",
  review: "待审核",
  approved: "已通过",
  exported: "已导出",
  discarded: "已废弃"
};
