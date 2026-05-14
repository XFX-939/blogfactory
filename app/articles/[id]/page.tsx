"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Save, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Article, ArticleStatus, statusLabels } from "@/lib/types";

const statuses: ArticleStatus[] = [
  "draft",
  "review",
  "approved",
  "exported",
  "discarded"
];

const optimizeActions = [
  { key: "title", label: "优化标题" },
  { key: "humanize", label: "去 AI 味" },
  { key: "viewpoint", label: "增加个人观点" },
  { key: "case", label: "增加工程案例" },
  { key: "moments", label: "压缩成朋友圈文案" },
  { key: "xiaohongshu", label: "转成小红书文案" },
  { key: "cover", label: "生成封面图 Prompt" }
];

export default function ArticleEditPage() {
  const params = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [tagText, setTagText] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState("");

  useEffect(() => {
    fetch(`/api/articles/${params.id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setArticle(json.article);
        setTagText((json.article.tags || []).join(", "));
      })
      .catch((err) => setError(err.message));
  }, [params.id]);

  function update<K extends keyof Article>(key: K, value: Article[K]) {
    setArticle((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save() {
    if (!article) return;
    setError("");
    setMessage("");
    const payload = {
      title: article.title,
      summary: article.summary,
      content: article.content,
      category: article.category,
      tags: tagText
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
      status: article.status,
      cover_prompt: article.cover_prompt
    };
    const res = await fetch(`/api/articles/${article.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      return;
    }
    setArticle(json.article);
    setMessage("已保存。");
  }

  async function optimize(action: string) {
    if (!article) return;
    setAiLoading(action);
    setAiResult("");
    setError("");
    const res = await fetch(`/api/articles/${article.id}/optimize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    const json = await res.json();
    setAiLoading("");
    if (!res.ok) {
      setError(json.error);
      return;
    }
    setAiResult(json.result);
  }

  if (!article) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        {error || "正在加载文章..."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">文章编辑</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>质量分 {article.quality_score ?? "-"}</Badge>
            <Badge>AI 风险 {article.ai_risk_score ?? "-"}</Badge>
            <Badge>敏感风险 {article.sensitive_risk_score ?? "-"}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={`/api/articles/${article.id}/export`}>
              <Download className="h-4 w-4" />
              导出 Markdown
            </a>
          </Button>
          <Button onClick={save}>
            <Save className="h-4 w-4" />
            保存
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
          {message}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>正文</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">标题</span>
              <Input
                value={article.title}
                onChange={(event) => update("title", event.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">摘要</span>
              <Textarea
                value={article.summary || ""}
                onChange={(event) => update("summary", event.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Markdown 正文</span>
              <Textarea
                value={article.content || ""}
                onChange={(event) => update("content", event.target.value)}
                className="min-h-[560px] font-mono text-sm"
              />
            </label>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>元信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium">分类</span>
                <Input
                  value={article.category || ""}
                  onChange={(event) => update("category", event.target.value)}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">标签</span>
                <Input
                  value={tagText}
                  onChange={(event) => setTagText(event.target.value)}
                  placeholder="AI Coding, 技术管理"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">状态</span>
                <Select
                  value={article.status}
                  onChange={(event) =>
                    update("status", event.target.value as ArticleStatus)
                  }
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">封面图 Prompt</span>
                <Textarea
                  value={article.cover_prompt || ""}
                  onChange={(event) => update("cover_prompt", event.target.value)}
                  className="min-h-28"
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI 优化</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {optimizeActions.map((action) => (
                <Button
                  key={action.key}
                  variant="outline"
                  onClick={() => optimize(action.key)}
                  disabled={!!aiLoading}
                  className="justify-start"
                >
                  <Sparkles className="h-4 w-4" />
                  {aiLoading === action.key ? "处理中..." : action.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          {aiResult && (
            <Card>
              <CardHeader>
                <CardTitle>AI 结果</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea value={aiResult} readOnly className="min-h-64" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
