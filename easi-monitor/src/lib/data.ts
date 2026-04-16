import fs from "fs";
import path from "path";
import type {
  RunConfig, RunSummary, EpisodeResult, TrajectoryStep,
  TaskInfo, RunInfo, EpisodeInfo,
} from "@/types/easi";

export function getLogsDir(): string {
  const dir = process.env.EASI_LOGS_DIR;
  if (dir) return dir;
  return path.resolve(process.cwd(), "..", "logs");
}

export function discoverTasks(logsDir: string): TaskInfo[] {
  if (!fs.existsSync(logsDir)) return [];
  const entries = fs.readdirSync(logsDir, { withFileTypes: true });
  const tasks: TaskInfo[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const taskPath = path.join(logsDir, entry.name);
    const runs = fs.readdirSync(taskPath, { withFileTypes: true });
    const runCount = runs.filter(
      (r) => r.isDirectory() && fs.existsSync(path.join(taskPath, r.name, "config.json"))
    ).length;
    if (runCount > 0) tasks.push({ name: entry.name, runCount });
  }
  return tasks.sort((a, b) => a.name.localeCompare(b.name));
}

export function discoverRuns(logsDir: string, taskName: string): RunInfo[] {
  const taskDir = path.join(logsDir, taskName);
  if (!fs.existsSync(taskDir)) return [];
  const entries = fs.readdirSync(taskDir, { withFileTypes: true });
  const runs: RunInfo[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const runDir = path.join(taskDir, entry.name);
    const configPath = path.join(runDir, "config.json");
    if (!fs.existsSync(configPath)) continue;

    let config: RunConfig | null = null;
    try { config = JSON.parse(fs.readFileSync(configPath, "utf-8")); } catch { /* skip */ }

    const summaryPath = path.join(runDir, "summary.json");
    let summary: RunSummary | null = null;
    const hasSummary = fs.existsSync(summaryPath);
    if (hasSummary) {
      try { summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8")); } catch { /* skip */ }
    }

    const dateMatch = entry.name.match(/^(\d{8})_(\d{6})/);
    const date = dateMatch
      ? `${dateMatch[1].slice(0, 4)}-${dateMatch[1].slice(4, 6)}-${dateMatch[1].slice(6, 8)} ${dateMatch[2].slice(0, 2)}:${dateMatch[2].slice(2, 4)}`
      : entry.name;

    const model = config?.cli_options?.model ?? entry.name;

    runs.push({ runId: entry.name, model, date, hasSummary, summary, config });
  }
  return runs.sort((a, b) => b.date.localeCompare(a.date));
}

export function discoverEpisodes(logsDir: string, taskName: string, runId: string): EpisodeInfo[] {
  const epDir = path.join(logsDir, taskName, runId, "episodes");
  if (!fs.existsSync(epDir)) return [];
  const entries = fs.readdirSync(epDir, { withFileTypes: true });
  const episodes: EpisodeInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const epPath = path.join(epDir, entry.name);

    let result: EpisodeResult | null = null;
    const resultPath = path.join(epPath, "result.json");
    if (fs.existsSync(resultPath)) {
      try { result = JSON.parse(fs.readFileSync(resultPath, "utf-8")); } catch { /* skip */ }
    }

    const hasZip = fs.existsSync(path.join(epPath, "images.zip"));
    const pngs = fs.readdirSync(epPath).filter((f) => f.endsWith(".png"));
    const hasImages = pngs.length > 0 || hasZip;

    let stepCount = 0;
    const trajPath = path.join(epPath, "trajectory.jsonl");
    if (fs.existsSync(trajPath)) {
      const content = fs.readFileSync(trajPath, "utf-8").trim();
      if (content) stepCount = content.split("\n").length;
    }

    episodes.push({
      episodeDir: entry.name,
      episodeId: result?.episode_id ?? entry.name,
      result, hasImages, hasZip, stepCount,
    });
  }

  return episodes.sort((a, b) => a.episodeDir.localeCompare(b.episodeDir));
}

export function readTrajectory(logsDir: string, taskName: string, runId: string, episodeDir: string): TrajectoryStep[] {
  const trajPath = path.join(logsDir, taskName, runId, "episodes", episodeDir, "trajectory.jsonl");
  if (!fs.existsSync(trajPath)) return [];
  const lines = fs.readFileSync(trajPath, "utf-8").trim().split("\n");
  const steps: TrajectoryStep[] = [];
  for (const line of lines) {
    try { steps.push(JSON.parse(line)); } catch { /* skip corrupted */ }
  }
  return steps;
}

export function getEpisodePath(logsDir: string, taskName: string, runId: string, episodeDir: string): string {
  return path.join(logsDir, taskName, runId, "episodes", episodeDir);
}
