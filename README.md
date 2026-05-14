# Felix Blog Factory

Felix Blog Factory 是一个个人博客文章生产工作台，用于把选题、资料、会议纪要、项目复盘和技术思考批量生成高质量博客文章。

## 功能

- Dashboard：文章数量统计、最近生成批次、快捷入口
- 批量生成：逐篇生成大纲、正文、摘要、分类、标签和质量评分
- 文章库：状态筛选、关键词搜索、编辑、审核、导出、删除
- 文章编辑：Markdown 正文编辑、元信息编辑、状态修改、AI 优化
- Prompt 设置：全局风格、文章生成、质量审核、敏感信息检查 Prompt
- Markdown 导出：带 Frontmatter，文件名使用 slug
- 深色/浅色模式与响应式布局

## 技术栈

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui 风格本地组件
- Supabase PostgreSQL
- OpenAI-compatible LLM API

## 启动

```bash
npm install
cp .env.example .env.local
npm run dev
```

打开 `http://localhost:3000`。

## Supabase 配置

1. 创建 Supabase 项目。
2. 在 Supabase SQL Editor 中执行：

```sql
-- 文件：supabase/migrations/001_init.sql
```

3. 在 `.env.local` 中填写：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 anon key
SUPABASE_SERVICE_ROLE_KEY=你的 service role key
```

MVP 没有用户登录，服务端接口会优先使用 `SUPABASE_SERVICE_ROLE_KEY`。

## LLM 配置

支持 OpenAI-compatible Chat Completions API：

```bash
LLM_API_KEY=你的 API Key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

如果使用其他兼容服务，把 `LLM_BASE_URL` 改成对应的 `/v1` 地址即可。

## 生成流程

批量生成不会一次性请求所有文章。前端会创建批次，然后逐个选题调用后端：

1. 根据选题和资料生成大纲
2. 根据大纲生成正文、摘要、分类、标签、封面 Prompt
3. 调用质量评分 Prompt，输出 `quality_score`、`ai_risk_score`、`sensitive_risk_score`
4. 保存文章
5. 每一步写入 `generation_logs`

单篇失败不会中断整批，失败原因会展示在页面并写入日志。

## 环境变量

见 `.env.example`。项目没有硬编码 API Key。
