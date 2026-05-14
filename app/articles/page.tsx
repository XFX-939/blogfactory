"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, Edit, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Article, ArticleStatus, statusLabels } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const filters: { value: "all" | ArticleStatus; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "draft", label: "草稿" },
  { value: "review", label: "待审核" },
  { value: "approved", label: "已通过" },
  { value: "exported", label: "已导出" },
  { value: "discarded", label: "已废弃" }
];

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [status, setStatus] = useState<"all" | ArticleStatus>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    params.set("status", status);
    if (query.trim()) params.set("q", query.trim());
    return `/api/articles?${params.toString()}`;
  }, [status, query]);

  useEffect(() => {
    setLoading(true);
    fetch(url)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setArticles(json.articles);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [url]);

  async function remove(id: string) {
    if (!window.confirm("确定删除这篇文章吗？")) return;
    const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      return;
    }
    setArticles((current) => current.filter((article) => article.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">文章库</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            审核、编辑和导出所有生成文章。
          </p>
        </div>
        <Button asChild>
          <Link href="/generate">新建批量生成</Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>筛选</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题、摘要、分类"
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value as "all" | ArticleStatus)}
            className="sm:w-44"
          >
            {filters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              正在加载文章...
            </div>
          ) : !articles.length ? (
            <div className="p-10 text-center">
              <div className="text-base font-medium">还没有文章</div>
              <p className="mt-2 text-sm text-muted-foreground">
                从批量生成页输入几个选题，文章会自动进入这里等待审核。
              </p>
              <Button asChild className="mt-4">
                <Link href="/generate">去生成文章</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-muted/70 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">标题</th>
                    <th className="px-4 py-3">分类</th>
                    <th className="px-4 py-3">标签</th>
                    <th className="px-4 py-3">字数</th>
                    <th className="px-4 py-3">质量分</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">创建时间</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((article) => (
                    <tr key={article.id} className="border-t">
                      <td className="max-w-64 px-4 py-3 font-medium">
                        <Link href={`/articles/${article.id}`} className="hover:underline">
                          {article.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{article.category || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(article.tags || []).slice(0, 3).map((tag) => (
                            <Badge key={tag}>{tag}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">{article.content?.length || 0}</td>
                      <td className="px-4 py-3">{article.quality_score ?? "-"}</td>
                      <td className="px-4 py-3">
                        <Badge>{statusLabels[article.status] || article.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(article.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon" title="编辑" asChild>
                            <Link href={`/articles/${article.id}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="outline" size="icon" title="审核" asChild>
                            <Link href={`/articles/${article.id}`}>
                              <Search className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="outline" size="icon" title="导出" asChild>
                            <a href={`/api/articles/${article.id}/export`}>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            title="删除"
                            onClick={() => remove(article.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
