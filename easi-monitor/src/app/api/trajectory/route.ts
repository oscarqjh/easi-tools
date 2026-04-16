import { NextRequest, NextResponse } from "next/server";
import { readTrajectory } from "@/lib/data";
import { validateSource, sanitizeSegment } from "@/lib/security";

export async function GET(request: NextRequest) {
  const task = request.nextUrl.searchParams.get("task");
  const run = request.nextUrl.searchParams.get("run");
  const ep = request.nextUrl.searchParams.get("ep");
  const sourcePath = request.nextUrl.searchParams.get("source");
  if (!task || !run || !ep) return NextResponse.json({ error: "task, run, and ep parameters required" }, { status: 400 });

  let logsDir: string;
  let safeTask: string;
  let safeRun: string;
  let safeEp: string;
  try {
    logsDir = validateSource(sourcePath);
    safeTask = sanitizeSegment(task);
    safeRun = sanitizeSegment(run);
    safeEp = sanitizeSegment(ep);
  } catch {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  try {
    return NextResponse.json(readTrajectory(logsDir, safeTask, safeRun, safeEp));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
