import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/store";

export async function GET() {
  try {
    return NextResponse.json(await getDashboardData());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dashboard 加载失败" },
      { status: 500 }
    );
  }
}
