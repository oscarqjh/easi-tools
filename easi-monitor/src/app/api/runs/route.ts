import { NextRequest, NextResponse } from "next/server";
import { getLogsDir, discoverRuns } from "@/lib/data";

export async function GET(request: NextRequest) {
  const task = request.nextUrl.searchParams.get("task");
  if (!task) return NextResponse.json({ error: "task parameter required" }, { status: 400 });
  try {
    return NextResponse.json(discoverRuns(getLogsDir(), task));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
