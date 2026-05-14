import { NextRequest, NextResponse } from "next/server";
import { listPrompts, resetPrompts, savePrompts } from "@/lib/store";

export async function GET() {
  try {
    return NextResponse.json({ prompts: await listPrompts() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Prompt 加载失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompts =
      body.action === "reset"
        ? await resetPrompts()
        : await savePrompts(
            body.prompts.map(
              (prompt: { key: string; name: string; content: string }) => ({
                key: prompt.key,
                name: prompt.name,
                content: prompt.content
              })
            )
          );
    return NextResponse.json({ prompts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Prompt 保存失败" },
      { status: 500 }
    );
  }
}
