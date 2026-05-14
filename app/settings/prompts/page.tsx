"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Prompt = {
  id?: string;
  key: string;
  name: string;
  content: string;
};

export default function PromptSettingsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/prompts")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setPrompts(json.prompts);
      })
      .catch((err) => setError(err.message));
  }, []);

  function update(key: string, content: string) {
    setPrompts((current) =>
      current.map((prompt) =>
        prompt.key === key ? { ...prompt, content } : prompt
      )
    );
  }

  async function save(action?: "reset") {
    setError("");
    setMessage("");
    const res = await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "reset" ? { action } : { prompts })
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      return;
    }
    setPrompts(json.prompts);
    setMessage(action === "reset" ? "已恢复默认 Prompt。" : "Prompt 已保存。");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Prompt 设置</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            调整全局风格、生成、质量审核与敏感信息检查策略。
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save("reset")}>
            <RotateCcw className="h-4 w-4" />
            恢复默认
          </Button>
          <Button onClick={() => save()}>
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

      {!prompts.length ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            正在加载 Prompt...
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {prompts.map((prompt) => (
            <Card key={prompt.key}>
              <CardHeader>
                <CardTitle>{prompt.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={prompt.content}
                  onChange={(event) => update(prompt.key, event.target.value)}
                  className="min-h-64 font-mono text-sm"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
