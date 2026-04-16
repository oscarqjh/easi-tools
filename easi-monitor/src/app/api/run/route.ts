import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
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

  const runDir = path.join(logsDir, safeTask, safeRun);
  const result: Record<string, unknown> = {};

  const configPath = path.join(runDir, "config.json");
  if (fs.existsSync(configPath)) {
    try { result.config = JSON.parse(fs.readFileSync(configPath, "utf-8")); } catch { /* skip */ }
  }

  const summaryPath = path.join(runDir, "summary.json");
  if (fs.existsSync(summaryPath)) {
    try { result.summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8")); } catch { /* skip */ }
  }

  return NextResponse.json(result);
}
