import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { TTLCache } from "./cache";
import type {
  RunConfig, RunSummary, EpisodeResult, TrajectoryStep,
  TaskInfo, RunInfo, EpisodeInfo,
} from "@/types/easi";

/** Internal task info without source metadata (added by API routes). */
type TaskInfoBase = Omit<TaskInfo, "source" | "sourcePath">;

/** Internal run info without source metadata (added by API routes). */
type RunInfoBase = Omit<RunInfo, "source" | "sourcePath">;

const tasksCache = new TTLCache<TaskInfoBase[]>();
const runsCache = new TTLCache<RunInfoBase[]>();
const episodesCache = new TTLCache<EpisodeInfo[]>();

/** Check if a config.json is from EASI (has run_id and cli_options). */
function isEasiConfig(configPath: string): boolean {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return typeof raw.run_id === "string" && raw.cli_options != null;
  } catch {
    return false;
  }
}

export function discoverTasks(logsDir: string): TaskInfoBase[] {
  const cacheKey = `tasks:${logsDir}`;
  const cached = tasksCache.get(cacheKey);
  if (cached) return cached;

  if (!fs.existsSync(logsDir)) return [];
  const entries = fs.readdirSync(logsDir, { withFileTypes: true });
  const tasks: TaskInfoBase[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const taskPath = path.join(logsDir, entry.name);
    const runs = fs.readdirSync(taskPath, { withFileTypes: true });
    const runCount = runs.filter(
      (r) => r.isDirectory() && isEasiConfig(path.join(taskPath, r.name, "config.json"))
    ).length;
    if (runCount > 0) tasks.push({ name: entry.name, runCount });
  }
  const result = tasks.sort((a, b) => a.name.localeCompare(b.name));
  tasksCache.set(cacheKey, result, 10_000);
  return result;
}

export function discoverRuns(logsDir: string, taskName: string): RunInfoBase[] {
  const cacheKey = `runs:${logsDir}:${taskName}`;
  const cached = runsCache.get(cacheKey);
  if (cached) return cached;

  const taskDir = path.join(logsDir, taskName);
  if (!fs.existsSync(taskDir)) return [];
  const entries = fs.readdirSync(taskDir, { withFileTypes: true });
  const runs: RunInfoBase[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const runDir = path.join(taskDir, entry.name);
    const configPath = path.join(runDir, "config.json");
    if (!isEasiConfig(configPath)) continue;

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
  const result = runs.sort((a, b) => b.date.localeCompare(a.date));
  runsCache.set(cacheKey, result, 10_000);
  return result;
}

async function fileExists(p: string): Promise<boolean> {
  try { await fsp.access(p); return true; } catch { return false; }
}

/** Run ``fn`` over ``items`` with at most ``limit`` in flight. Preserves index order. */
async function mapWithConcurrency<T, R>(
  items: T[], limit: number, fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let nextIdx = 0;
  const worker = async () => {
    while (true) {
      const i = nextIdx++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  };
  const workers = Array.from(
    { length: Math.min(limit, items.length) }, () => worker(),
  );
  await Promise.all(workers);
  return out;
}

async function scanEpisode(epDir: string, name: string): Promise<EpisodeInfo> {
  const epPath = path.join(epDir, name);

  // result.json — small, always read first so step count can fall back to
  // the old path when ``num_steps`` is absent.
  let result: EpisodeResult | null = null;
  try {
    const raw = await fsp.readFile(path.join(epPath, "result.json"), "utf-8");
    result = JSON.parse(raw);
  } catch {
    // result stays null; ep still listed.
  }

  // Cheap has-images probe. Avoids readdir over dirs with ~1500 symlinks.
  const hasZip = await fileExists(path.join(epPath, "images.zip"));
  const hasImages = hasZip
    || await fileExists(path.join(epPath, "step_0000_front.png"))
    || await fileExists(path.join(epPath, "step_0000.png"));

  // Prefer the step count already written in result.json; fall back to a
  // full trajectory.jsonl read only when it isn't there.
  let stepCount = 0;
  const numStepsFromResult = result?.num_steps;
  if (typeof numStepsFromResult === "number") {
    stepCount = Math.max(0, Math.round(numStepsFromResult));
  } else {
    const trajPath = path.join(epPath, "trajectory.jsonl");
    try {
      const content = (await fsp.readFile(trajPath, "utf-8")).trim();
      if (content) stepCount = content.split("\n").length;
    } catch {
      // trajectory missing or unreadable; keep stepCount = 0.
    }
  }

  return {
    episodeDir: name,
    episodeId: result?.episode_id ?? name,
    result, hasImages, hasZip, stepCount,
  };
}

export async function discoverEpisodes(
  logsDir: string, taskName: string, runId: string,
): Promise<EpisodeInfo[]> {
  const cacheKey = `episodes:${logsDir}:${taskName}:${runId}`;
  const cached = episodesCache.get(cacheKey);
  if (cached) return cached;

  const epDir = path.join(logsDir, taskName, runId, "episodes");
  if (!fs.existsSync(epDir)) return [];

  const entries = await fsp.readdir(epDir, { withFileTypes: true });
  const names = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  // Per-ep errors are contained so one bad episode doesn't nuke the whole
  // listing (keeps index alignment with summary.json's num_episodes).
  const episodes = await mapWithConcurrency(names, 64, async (name) => {
    try {
      return await scanEpisode(epDir, name);
    } catch {
      return {
        episodeDir: name,
        episodeId: name,
        result: null,
        hasImages: false,
        hasZip: false,
        stepCount: 0,
      } satisfies EpisodeInfo;
    }
  });

  episodesCache.set(cacheKey, episodes, 30_000);
  return episodes;
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
