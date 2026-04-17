import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { loadConfig, getTaskConfig } from "@/lib/config";
import { validateSource, sanitizeSegment } from "@/lib/security";

export async function GET(request: NextRequest) {
  const task = request.nextUrl.searchParams.get("task");
  const run = request.nextUrl.searchParams.get("run");
  const sourcePath = request.nextUrl.searchParams.get("source");

  if (!task || !run) {
    return NextResponse.json({ error: "task and run required" }, { status: 400 });
  }

  let logsDir: string, safeTask: string, safeRun: string;
  try {
    logsDir = validateSource(sourcePath);
    safeTask = sanitizeSegment(task);
    safeRun = sanitizeSegment(run);
  } catch {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const config = loadConfig();
  const taskConfig = getTaskConfig(config, safeTask);
  if (!taskConfig?.datasets_dir) {
    return NextResponse.json({ error: "datasets_dir not configured for this task" }, { status: 404 });
  }

  // Read run config to get dataset info
  const runConfigPath = path.join(logsDir, safeTask, safeRun, "config.json");
  if (!fs.existsSync(runConfigPath)) {
    return NextResponse.json({ error: "run config not found" }, { status: 404 });
  }

  let runConfig;
  try { runConfig = JSON.parse(fs.readFileSync(runConfigPath, "utf-8")); } catch {
    return NextResponse.json({ error: "invalid config" }, { status: 500 });
  }

  const repoId = runConfig.task_config?.dataset?.repo_id;
  const split = runConfig.task_config?.dataset?.split;
  if (!repoId || !split) {
    return NextResponse.json({ error: "dataset info not in config" }, { status: 404 });
  }

  const repoDir = repoId.replace("/", "_");
  const jsonlPath = path.join(taskConfig.datasets_dir, repoDir, "data", `${split}.jsonl`);
  if (!fs.existsSync(jsonlPath)) {
    return NextResponse.json({ error: "dataset not found" }, { status: 404 });
  }

  // Parse all lines into an array indexed by episode number
  const lines = fs.readFileSync(jsonlPath, "utf-8").trim().split("\n");
  const episodes = lines.map((line, idx) => {
    try {
      const data = JSON.parse(line);
      return { index: idx, ...data };
    } catch {
      return { index: idx };
    }
  });

  return NextResponse.json(episodes);
}
