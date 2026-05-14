"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, FilePlus2, Library, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Batch } from "@/lib/types";

type DashboardData = {
  total: number;
  draft: number;
  review: number;
  exported: number;
  batches: Batch[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setData(json);
      })
      .catch((err) => setError(err.message));
  }, []);

  const stats = [
    { label: "总文章数", value: data?.total ?? "-" },
    { label: "草稿数", value: data?.draft ?? "-" },
    { label: "待审核数", value: data?.review ?? "-" },
    { label: "已导出数", value: data?.exported ?? "-" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理选题、资料、复盘和技术思考的文章生产流。
          </p>
        </div>
        <Button asChild>
          <Link href="/generate">
            <FilePlus2 className="h-4 w-4" />
            批量生成
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>最近生成批次</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.batches?.length ? (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                暂无批次。先从一组选题开始，把零散思考沉淀成文章。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-3 pr-4">批次</th>
                      <th className="py-3 pr-4">状态</th>
                      <th className="py-3 pr-4">成功/总数</th>
                      <th className="py-3 pr-4">创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.batches.map((batch) => (
                      <tr key={batch.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{batch.name}</td>
                        <td className="py-3 pr-4">
                          <Badge>{batch.status}</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {batch.success_count || 0}/{batch.total_count || 0}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatDate(batch.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>快捷入口</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {[
              { href: "/generate", label: "新建文章", icon: FilePlus2 },
              { href: "/generate", label: "批量生成", icon: Library },
              { href: "/articles", label: "文章库", icon: BookOpen },
              { href: "/settings/prompts", label: "Prompt 设置", icon: Settings2 }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Button key={item.label} variant="outline" asChild>
                  <Link href={item.href} className="justify-start">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
