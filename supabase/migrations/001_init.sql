create extension if not exists "pgcrypto";

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  summary text,
  content text,
  category text,
  tags text[] default '{}',
  article_type text,
  tone text,
  length_type text,
  status text not null default 'draft',
  quality_score integer,
  ai_risk_score integer,
  sensitive_risk_score integer,
  cover_prompt text,
  source_input text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.article_batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  input_topics text,
  input_material text,
  generation_mode text,
  article_type text,
  tone text,
  length_type text,
  status text,
  total_count integer not null default 0,
  success_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.generation_logs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.article_batches(id) on delete set null,
  article_id uuid references public.articles(id) on delete set null,
  step text,
  status text,
  message text,
  raw_response text,
  created_at timestamptz not null default now()
);

create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_status_idx on public.articles(status);
create index if not exists articles_created_at_idx on public.articles(created_at desc);
create index if not exists article_batches_created_at_idx on public.article_batches(created_at desc);
create index if not exists generation_logs_batch_id_idx on public.generation_logs(batch_id);

insert into public.prompts (key, name, content)
values
(
  'global_style',
  '全局写作风格 Prompt',
  '你是一名无线通信算法工程师和技术管理者，关注系统仿真、AI For Work、AI Coding、技术管理和个人成长。

写作要求：
1. 使用中文。
2. 结论先行。
3. 不写鸡汤。
4. 不使用营销号语气。
5. 多用真实工程研发、团队管理、项目推进中的场景。
6. 每篇文章必须有明确观点。
7. 不要空泛表达。
8. 不要堆叠“赋能、闭环、抓手、认知升级”等套话。
9. 能讲取舍、风险、边界和落地路径。
10. 尽量使用第一人称，但不要过度自我包装。
11. 内容要像真实工程师和技术管理者写出来的，不要像 AI 模板文。
12. 不要编造具体公司、客户、项目和数据。
13. 涉及内部项目时要做泛化表达，避免泄露敏感信息。'
),
(
  'article_generation',
  '文章生成 Prompt',
  '根据输入选题、资料和大纲生成一篇中文博客文章。要求观点明确、结构清晰、包含工程或管理现场感，避免空泛套话，不编造不可验证的具体事实。'
),
(
  'quality_review',
  '质量审核 Prompt',
  '请从观点、个人经验、工程现场感、具体例子、结构、AI 味、空泛表达、敏感信息风险和发布价值等维度审核文章，并只输出合法 JSON。'
),
(
  'sensitive_check',
  '敏感信息检查 Prompt',
  '重点识别公司内部项目代号、客户名称、具体人名、内部组织名称、未公开数据、版本节奏、具体商用信息、内部会议原文、可能涉密技术细节。发现风险时标记风险，不要自动删除。'
)
on conflict (key) do update set
  name = excluded.name,
  content = excluded.content,
  updated_at = now();
