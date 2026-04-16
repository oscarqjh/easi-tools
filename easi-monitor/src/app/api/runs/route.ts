import { NextRequest, NextResponse } from "next/server";
import { loadConfig } from "@/lib/config";
import { discoverRuns } from "@/lib/data";
import { validateSource, sanitizeSegment } from "@/lib/security";

export async function GET(request: NextRequest) {
  const task = request.nextUrl.searchParams.get("task");
  const sourcePath = request.nextUrl.searchParams.get("source");
  if (!task) return NextResponse.json({ error: "task parameter required" }, { status: 400 });

  let logsDir: string;
  let safeTask: string;
  try {
    logsDir = validateSource(sourcePath);
    safeTask = sanitizeSegment(task);
  } catch {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const config = loadConfig();
  const sourceName = config.sources.find(s => s.path === logsDir)?.name ?? "Unknown";

  try {
    const runs = discoverRuns(logsDir, safeTask);
    return NextResponse.json(runs.map(r => ({ ...r, source: sourceName, sourcePath: logsDir })));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
