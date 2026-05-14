import { randomUUID } from "crypto";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { DEFAULT_PROMPTS } from "@/lib/default-prompts";
import type { Article, ArticleStatus, Batch } from "@/lib/types";

type PromptRecord = {
  id: string;
  key: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type GenerationLog = {
  id: string;
  batch_id: string | null;
  article_id: string | null;
  step: string | null;
  status: string | null;
  message: string | null;
  raw_response: string | null;
  created_at: string;
};

type Database = {
  articles: Article[];
  article_batches: Batch[];
  generation_logs: GenerationLog[];
  prompts: PromptRecord[];
};

type ArticleInput = Omit<Article, "id" | "created_at" | "updated_at"> &
  Partial<Pick<Article, "id" | "created_at" | "updated_at">>;

type BatchInput = Omit<Batch, "id" | "created_at" | "updated_at"> &
  Partial<Pick<Batch, "id" | "created_at" | "updated_at">>;

function resolveDataDir() {
  if (process.env.BLOGFACTORY_DATA_DIR) return process.env.BLOGFACTORY_DATA_DIR;
  if (process.env.NODE_ENV !== "production") return path.resolve(process.cwd(), "data");

  const cwd = process.cwd();
  if (path.basename(path.dirname(cwd)) === "releases") {
    return path.resolve(cwd, "..", "..", "data");
  }
  return path.resolve(cwd, "..", "data");
}

const dataDir = resolveDataDir();

const dbPath = path.join(dataDir, "blogfactory.json");
let writeQueue = Promise.resolve();

function now() {
  return new Date().toISOString();
}

function defaultPrompts(): PromptRecord[] {
  const timestamp = now();
  return DEFAULT_PROMPTS.map((prompt) => ({
    id: randomUUID(),
    key: prompt.key,
    name: prompt.name,
    content: prompt.content,
    created_at: timestamp,
    updated_at: timestamp
  }));
}

function createEmptyDatabase(): Database {
  return {
    articles: [],
    article_batches: [],
    generation_logs: [],
    prompts: defaultPrompts()
  };
}

async function ensureDataFile() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(dbPath, "utf8");
  } catch {
    await writeDatabase(createEmptyDatabase());
  }
}

function normalizeDatabase(db: Partial<Database>): Database {
  const prompts = db.prompts || [];
  const existingPromptKeys = new Set(prompts.map((prompt) => prompt.key));
  const missingPrompts = defaultPrompts().filter(
    (prompt) => !existingPromptKeys.has(prompt.key)
  );

  return {
    articles: db.articles || [],
    article_batches: db.article_batches || [],
    generation_logs: db.generation_logs || [],
    prompts: [...prompts, ...missingPrompts]
  };
}

async function readDatabase(): Promise<Database> {
  await ensureDataFile();
  const raw = await readFile(dbPath, "utf8");
  return normalizeDatabase(JSON.parse(raw) as Partial<Database>);
}

async function writeDatabase(db: Database) {
  await mkdir(dataDir, { recursive: true });
  const tmpPath = `${dbPath}.${process.pid}.tmp`;
  await writeFile(tmpPath, JSON.stringify(db, null, 2), "utf8");
  await rename(tmpPath, dbPath);
}

async function updateDatabase<T>(mutate: (db: Database) => T | Promise<T>) {
  const run = async () => {
    const db = await readDatabase();
    const result = await mutate(db);
    await writeDatabase(db);
    return result;
  };
  const next = writeQueue.then(run, run);
  writeQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

export async function getDashboardData() {
  const db = await readDatabase();
  const articles = db.articles;
  return {
    total: articles.length,
    draft: articles.filter((article) => article.status === "draft").length,
    review: articles.filter((article) => article.status === "review").length,
    exported: articles.filter((article) => article.status === "exported").length,
    batches: db.article_batches
      .slice()
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, 5)
  };
}

export async function listArticles(input: {
  status?: "all" | ArticleStatus | null;
  q?: string | null;
}) {
  const db = await readDatabase();
  const keyword = input.q?.trim().toLowerCase();
  return db.articles
    .filter((article) => !input.status || input.status === "all" || article.status === input.status)
    .filter((article) => {
      if (!keyword) return true;
      return [
        article.title,
        article.summary,
        article.category,
        ...(article.tags || [])
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    })
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export async function getArticle(id: string) {
  const db = await readDatabase();
  return db.articles.find((article) => article.id === id) || null;
}

export async function createArticle(input: ArticleInput) {
  return updateDatabase((db) => {
    const timestamp = now();
    const article: Article = {
      ...input,
      id: input.id || randomUUID(),
      created_at: input.created_at || timestamp,
      updated_at: input.updated_at || timestamp
    };
    db.articles.push(article);
    return article;
  });
}

export async function updateArticle(id: string, input: Partial<Article>) {
  return updateDatabase((db) => {
    const index = db.articles.findIndex((article) => article.id === id);
    if (index < 0) throw new Error("文章不存在。");
    db.articles[index] = {
      ...db.articles[index],
      ...input,
      id,
      updated_at: now()
    };
    return db.articles[index];
  });
}

export async function deleteArticle(id: string) {
  return updateDatabase((db) => {
    db.articles = db.articles.filter((article) => article.id !== id);
  });
}

export async function createBatch(input: BatchInput) {
  return updateDatabase((db) => {
    const timestamp = now();
    const batch: Batch = {
      ...input,
      id: input.id || randomUUID(),
      created_at: input.created_at || timestamp,
      updated_at: input.updated_at || timestamp
    };
    db.article_batches.push(batch);
    return batch;
  });
}

export async function updateBatch(id: string, input: Partial<Batch>) {
  return updateDatabase((db) => {
    const index = db.article_batches.findIndex((batch) => batch.id === id);
    if (index < 0) throw new Error("批次不存在。");
    db.article_batches[index] = {
      ...db.article_batches[index],
      ...input,
      id,
      updated_at: now()
    };
    return db.article_batches[index];
  });
}

export async function createGenerationLog(input: {
  batch_id: string;
  article_id?: string;
  step: string;
  status: string;
  message: string;
  raw_response?: string;
}) {
  return updateDatabase((db) => {
    const log: GenerationLog = {
      id: randomUUID(),
      batch_id: input.batch_id,
      article_id: input.article_id || null,
      step: input.step,
      status: input.status,
      message: input.message,
      raw_response: input.raw_response || null,
      created_at: now()
    };
    db.generation_logs.push(log);
    return log;
  });
}

export async function listPrompts() {
  const db = await readDatabase();
  return db.prompts.sort((a, b) => a.key.localeCompare(b.key));
}

export async function savePrompts(
  prompts: Array<{ key: string; name: string; content: string }>
) {
  return updateDatabase((db) => {
    const timestamp = now();
    db.prompts = prompts.map((prompt) => {
      const existing = db.prompts.find((item) => item.key === prompt.key);
      return {
        id: existing?.id || randomUUID(),
        key: prompt.key,
        name: prompt.name,
        content: prompt.content,
        created_at: existing?.created_at || timestamp,
        updated_at: timestamp
      };
    });
    return db.prompts;
  });
}

export async function resetPrompts() {
  return updateDatabase((db) => {
    db.prompts = defaultPrompts();
    return db.prompts;
  });
}

export async function getPromptMap() {
  const prompts = await listPrompts();
  return new Map(prompts.map((prompt) => [prompt.key, prompt.content]));
}
