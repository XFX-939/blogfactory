"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const generationModes = ["根据选题生成", "根据资料生成", "根据专栏规划生成"];
const articleTypes = ["技术解读", "管理复盘", "方法论文章", "项目复盘", "观点短文"];
const lengthTypes = ["短文 800-1200 字", "标准 1500-2500 字", "深度 3000 字以上"];
const tones = ["克制专业", "工程师视角", "管理者视角", "第一人称"];

type Failure = { topic: string; reason: string };

export default function GeneratePage() {
  const router = useRouter();
  const [topics, setTopics] = useState("");
  const [material, setMaterial] = useState("");
  const [generationMode, setGenerationMode] = useState(generationModes[0]);
  const [articleType, setArticleType] = useState(articleTypes[0]);
  const [lengthType, setLengthType] = useState(lengthTypes[1]);
  const [tone, setTone] = useState(tones[0]);
  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState("等待开始");
  const [success, setSuccess] = useState(0);
  const [failed, setFailed] = useState<Failure[]>([]);
  const [error, setError] = useState("");

  const topicList = topics
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const progress = topicList.length
    ? Math.round(((success + failed.length) / topicList.length) * 100)
    : 0;

  async function generate() {
    setError("");
    setFailed([]);
    setSuccess(0);
    setCurrentIndex(0);

    if (!topicList.length && !material.trim()) {
      setError("请至少输入一个选题，或粘贴一段资料。");
      return;
    }

    const effectiveTopics = topicList.length ? topicList : ["根据资料生成文章"];
    setRunning(true);

    try {
      setCurrentStep("创建生成批次");
      const batchRes = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_topics: effectiveTopics.join("\n"),
          input_material: material,
          generation_mode: generationMode,
          article_type: articleType,
          tone,
          length_type: lengthType,
          total_count: effectiveTopics.length
        })
      });
      const batchJson = await batchRes.json();
      if (!batchRes.ok) throw new Error(batchJson.error);
      const batchId = batchJson.batch.id;

      let successCount = 0;
      const failures: Failure[] = [];

      for (let index = 0; index < effectiveTopics.length; index += 1) {
        const topic = effectiveTopics[index];
        setCurrentIndex(index + 1);
        setCurrentStep("生成大纲 / 生成正文 / 质量评分 / 保存");

        try {
          const res = await fetch("/api/generate/article", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              batch_id: batchId,
              topic,
              material,
              generation_mode: generationMode,
              article_type: articleType,
              tone,
              length_type: lengthType
            })
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "生成失败");
          successCount += 1;
          setSuccess(successCount);
        } catch (err) {
          failures.push({
            topic,
            reason: err instanceof Error ? err.message : "生成失败"
          });
          setFailed([...failures]);
        }
      }

      setCurrentStep("更新批次状态");
      await fetch("/api/batches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: batchId,
          status: failures.length ? "completed_with_errors" : "completed",
          success_count: successCount,
          failed_count: failures.length
        })
      });

      setCurrentStep("生成完成，正在进入文章库");
      router.push("/articles");
    } catch (err) {
      setError(err instanceof Error ? err.message : "批量生成失败");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">批量生成</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          每行一个选题，系统会逐篇生成并保存，不会把整批一次性丢给模型。
        </p>
      </div>

      {error && (
        <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>输入</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">选题列表</span>
              <Textarea
                value={topics}
                onChange={(event) => setTopics(event.target.value)}
                placeholder={"AI Coding 如何真正进入无线算法仿真流程\n技术管理里最容易被低估的复盘动作"}
                className="min-h-40"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">资料内容</span>
              <Textarea
                value={material}
                onChange={(event) => setMaterial(event.target.value)}
                placeholder="粘贴会议纪要、项目复盘、技术笔记或资料片段。"
                className="min-h-56"
              />
            </label>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>生成参数</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Field label="生成模式" value={generationMode} onChange={setGenerationMode} options={generationModes} />
              <Field label="文章类型" value={articleType} onChange={setArticleType} options={articleTypes} />
              <Field label="文章长度" value={lengthType} onChange={setLengthType} options={lengthTypes} />
              <Field label="语气" value={tone} onChange={setTone} options={tones} />
              <Button onClick={generate} disabled={running} className="sm:col-span-2 xl:col-span-1">
                <Play className="h-4 w-4" />
                {running ? "生成中" : "开始生成"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>进度</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress} />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md bg-secondary p-3">
                  当前：{currentIndex || 0}/{topicList.length || 0}
                </div>
                <div className="rounded-md bg-secondary p-3">总进度：{progress}%</div>
                <div className="rounded-md bg-secondary p-3">成功：{success}</div>
                <div className="rounded-md bg-secondary p-3">失败：{failed.length}</div>
              </div>
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                当前步骤：{currentStep}
              </div>
              {!!failed.length && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-destructive">
                    失败文章
                  </div>
                  {failed.map((item) => (
                    <div key={item.topic} className="rounded-md border border-destructive/30 p-3 text-sm">
                      <div className="font-medium">{item.topic}</div>
                      <div className="mt-1 text-destructive">{item.reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </Select>
    </label>
  );
}
