import { NextRequest, NextResponse } from "next/server";
import { discoverEpisodes } from "@/lib/data";
import { validateSource, sanitizeSegment } from "@/lib/security";

export async function GET(request: NextRequest) {
  const task = request.nextUrl.searchParams.get("task");
  const run = request.nextUrl.searchParams.get("run");
  const sourcePath = request.nextUrl.searchParams.get("source");
  if (!task || !run) return NextResponse.json({ error: "task and run parameters required" }, { status: 400 });

  let logsDir: string;
  let safeTask: string;
  let safeRun: string;
  try {
    logsDir = validateSource(sourcePath);
    safeTask = sanitizeSegment(task);
    safeRun = sanitizeSegment(run);
  } catch {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  try {
    return NextResponse.json(discoverEpisodes(logsDir, safeTask, safeRun));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
