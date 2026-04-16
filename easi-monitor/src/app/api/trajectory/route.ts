import { NextRequest, NextResponse } from "next/server";
import { loadConfig } from "@/lib/config";
import { readTrajectory } from "@/lib/data";

export async function GET(request: NextRequest) {
  const task = request.nextUrl.searchParams.get("task");
  const run = request.nextUrl.searchParams.get("run");
  const ep = request.nextUrl.searchParams.get("ep");
  const sourcePath = request.nextUrl.searchParams.get("source");
  if (!task || !run || !ep) return NextResponse.json({ error: "task, run, and ep parameters required" }, { status: 400 });

  const config = loadConfig();
  const logsDir = sourcePath ?? config.sources[0]?.path ?? "";

  try {
    return NextResponse.json(readTrajectory(logsDir, task, run, ep));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
