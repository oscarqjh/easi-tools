import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { loadConfig, getTaskConfig } from "@/lib/config";
import { validateSource, sanitizeSegment } from "@/lib/security";

export async function GET(request: NextRequest) {
  const task = request.nextUrl.searchParams.get("task");
  const run = request.nextUrl.searchParams.get("run");
  const epDir = request.nextUrl.searchParams.get("ep");
  const sourcePath = request.nextUrl.searchParams.get("source");

  if (!task || !run || !epDir) {
    return NextResponse.json({ error: "task, run, ep required" }, { status: 400 });
  }

  let logsDir: string;
  let safeTask: string;
  let safeRun: string;
  let safeEp: string;
  try {
    logsDir = validateSource(sourcePath);
    safeTask = sanitizeSegment(task);
    safeRun = sanitizeSegment(run);
    safeEp = sanitizeSegment(epDir);
  } catch {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const config = loadConfig();
  const taskConfig = getTaskConfig(config, safeTask);
  if (!taskConfig?.datasets_dir) {
    return NextResponse.json({ error: "datasets_dir not configured for this task" }, { status: 404 });
  }

  // Read run config to get dataset info
  const configPath = path.join(logsDir, safeTask, safeRun, "config.json");
  if (!fs.existsSync(configPath)) {
    return NextResponse.json({ error: "run config not found" }, { status: 404 });
  }

  let runConfig;
  try { runConfig = JSON.parse(fs.readFileSync(configPath, "utf-8")); } catch {
    return NextResponse.json({ error: "invalid config" }, { status: 500 });
  }

  const repoId = runConfig.task_config?.dataset?.repo_id;
  const split = runConfig.task_config?.dataset?.split;
  if (!repoId || !split) {
    return NextResponse.json({ error: "dataset info not in config" }, { status: 404 });
  }

  // Convert repo_id to directory name (oscarqjh/LHPR-VLN_easi -> oscarqjh_LHPR-VLN_easi)
  const repoDir = repoId.replace("/", "_");
  const jsonlPath = path.join(taskConfig.datasets_dir, repoDir, "data", `${split}.jsonl`);

  if (!fs.existsSync(jsonlPath)) {
    return NextResponse.json({ error: `dataset not found: ${jsonlPath}` }, { status: 404 });
  }

  // Extract episode index from episode directory name (e.g., "019_ep_19" -> 19)
  const indexMatch = safeEp.match(/^(\d+)_/);
  if (!indexMatch) {
    return NextResponse.json({ error: "cannot parse episode index from dir name" }, { status: 400 });
  }
  const episodeIndex = parseInt(indexMatch[1], 10);

  // Read the specific line from JSONL
  const lines = fs.readFileSync(jsonlPath, "utf-8").trim().split("\n");
  if (episodeIndex >= lines.length) {
    return NextResponse.json({ error: "episode index out of range" }, { status: 404 });
  }

  try {
    const episodeMeta = JSON.parse(lines[episodeIndex]);
    return NextResponse.json(episodeMeta);
  } catch {
    return NextResponse.json({ error: "invalid JSONL line" }, { status: 500 });
  }
}
