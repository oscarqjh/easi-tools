import { NextResponse } from "next/server";
import { loadConfig } from "@/lib/config";
import { discoverTasks, discoverRuns } from "@/lib/data";
import type { OverviewData, OverviewTask, RecentRun } from "@/types/easi";

export async function GET() {
  try {
    const config = loadConfig();

    const tasks: OverviewTask[] = [];
    const allRuns: RecentRun[] = [];

    let totalEpisodes = 0;
    let srMax = 0;
    let totalRunCount = 0;

    for (const source of config.sources) {
      const taskInfos = discoverTasks(source.path);

      for (const taskInfo of taskInfos) {
        const runs = discoverRuns(source.path, taskInfo.name);
        totalRunCount += runs.length;

        // Find latest run (runs are already sorted by date descending)
        const latest = runs[0] ?? null;

        let latestRunData: OverviewTask["latestRun"] = null;
        if (latest) {
          const sr =
            typeof latest.summary?.success_rate === "number"
              ? latest.summary.success_rate
              : null;
          latestRunData = {
            runId: latest.runId,
            model: latest.model,
            date: latest.date,
            successRate: sr,
            hasSummary: latest.hasSummary,
          };
        }

        tasks.push({
          name: taskInfo.name,
          runCount: runs.length,
          source: source.name,
          sourcePath: source.path,
          latestRun: latestRunData,
        });

        // Collect all runs for recent runs list and aggregate stats
        for (const run of runs) {
          const sr =
            typeof run.summary?.success_rate === "number"
              ? run.summary.success_rate
              : null;
          const numEpisodes =
            typeof run.summary?.num_episodes === "number"
              ? run.summary.num_episodes
              : null;

          if (numEpisodes !== null) {
            totalEpisodes += numEpisodes;
          }
          if (sr !== null && sr > srMax) {
            srMax = sr;
          }
          // Fallback: check summary.metrics for a primary metric
          if (sr === null && run.summary?.metrics) {
            const firstMetric = Object.values(run.summary.metrics).find(v => typeof v === "number") as number | undefined;
            if (firstMetric !== undefined && firstMetric > srMax) {
              srMax = firstMetric;
            }
          }

          allRuns.push({
            task: taskInfo.name,
            runId: run.runId,
            model: run.model,
            date: run.date,
            successRate: sr,
            numEpisodes,
            hasSummary: run.hasSummary,
            source: source.name,
            sourcePath: source.path,
          });
        }
      }
    }

    // Sort all runs by date descending, take top 20
    allRuns.sort((a, b) => b.date.localeCompare(a.date));
    const recentRuns = allRuns.slice(0, 20);

    const result: OverviewData = {
      totalRuns: totalRunCount,
      totalTasks: tasks.length,
      totalEpisodes,
      maxSuccessRate: srMax,
      tasks,
      recentRuns,
    };

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
