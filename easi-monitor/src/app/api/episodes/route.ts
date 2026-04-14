import { NextRequest, NextResponse } from "next/server";
import { getLogsDir, discoverEpisodes } from "@/lib/data";

export async function GET(request: NextRequest) {
  const task = request.nextUrl.searchParams.get("task");
  const run = request.nextUrl.searchParams.get("run");
  if (!task || !run) return NextResponse.json({ error: "task and run parameters required" }, { status: 400 });
  try {
    return NextResponse.json(discoverEpisodes(getLogsDir(), task, run));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
