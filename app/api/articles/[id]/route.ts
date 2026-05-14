import { NextRequest, NextResponse } from "next/server";
import { deleteArticle, getArticle, updateArticle } from "@/lib/store";
import { slugify } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const article = await getArticle(id);
    if (!article) throw new Error("文章不存在。");
    return NextResponse.json({ article });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "文章加载失败" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updates = {
      ...body,
      slug: body.title ? slugify(body.title) : body.slug
    };
    return NextResponse.json({ article: await updateArticle(id, updates) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "文章保存失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteArticle(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "文章删除失败" },
      { status: 500 }
    );
  }
}
