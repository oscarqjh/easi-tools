"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOverview } from "@/lib/hooks";
import { timeAgo } from "@/lib/episode-utils";
import { Inbox } from "lucide-react";

function OverviewSkeleton() {
  return (
    <div className="space-y-8">
      {/* Stat cards skeleton */}
      <div>
        <div className="h-3 w-24 bg-card rounded-sm animate-pulse mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border border-l-2 rounded-sm p-3">
              <div className="h-3 w-20 bg-muted-foreground/10 rounded-sm animate-pulse mb-2" />
              <div className="h-7 w-16 bg-muted-foreground/10 rounded-sm animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      {/* Task cards skeleton */}
      <div>
        <div className="h-3 w-16 bg-card rounded-sm animate-pulse mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-border rounded-sm p-4">
              <div className="h-4 w-64 bg-muted-foreground/10 rounded-sm animate-pulse mb-2" />
              <div className="h-3 w-96 bg-muted-foreground/10 rounded-sm animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      {/* Recent runs skeleton */}
      <div>
        <div className="h-3 w-28 bg-card rounded-sm animate-pulse mb-3" />
        <div className="border border-border rounded-sm overflow-hidden">
          <div className="bg-popover px-4 py-2.5">
            <div className="h-3 w-full bg-muted-foreground/10 rounded-sm animate-pulse" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3 border-b border-border">
              <div className="h-4 w-48 bg-muted-foreground/10 rounded-sm animate-pulse" />
              <div className="h-4 w-24 bg-muted-foreground/10 rounded-sm animate-pulse" />
              <div className="h-4 w-12 bg-muted-foreground/10 rounded-sm animate-pulse" />
              <div className="h-4 w-12 bg-muted-foreground/10 rounded-sm animate-pulse" />
              <div className="h-4 w-16 bg-muted-foreground/10 rounded-sm animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, loading, error } = useOverview();
  const router = useRouter();

  if (loading) return <OverviewSkeleton />;

  if (data === null && !loading) {
    return (
      <div className="text-center py-20">
        <div className="text-destructive text-sm font-mono">Failed to load overview data{error ? `: ${error}` : ""}</div>
      </div>
    );
  }

  if (!data || data.totalTasks === 0) {
    return (
      <div className="text-center py-20">
        <Inbox className="size-12 text-muted-foreground/50 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">No tasks found</h2>
        <p className="text-muted-foreground">
          Configure sources in monitor.yaml or set EASI_LOGS_DIR environment variable.
        </p>
      </div>
    );
  }

  const statCards = [
    { label: "Total Runs", value: String(data.totalRuns), accent: "border-l-primary" },
    { label: "Tasks", value: String(data.totalTasks), accent: "border-l-info" },
    { label: "Episodes", value: data.totalEpisodes.toLocaleString(), accent: "border-l-warning" },
    { label: "Max Success Rate", value: `${(data.maxSuccessRate * 100).toFixed(1)}%`, accent: "border-l-success" },
  ];

  const hasMultipleSources = new Set(data.tasks.map(t => t.source)).size > 1;

  return (
    <div className="space-y-8">
      {/* Aggregate stats */}
      <div>
        <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-3">
          Overview
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((c) => (
            <div key={c.label} className={`bg-card border border-border border-l-2 ${c.accent} rounded-sm p-3`}>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans mb-2">
                {c.label}
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">{c.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Task cards */}
      <div>
        <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-3">
          Tasks
        </div>
        <div className="space-y-2">
          {data.tasks.map((task) => (
            <Link
              key={`${task.sourcePath}:${task.name}`}
              href={`/task/${encodeURIComponent(task.name)}?source=${encodeURIComponent(task.sourcePath)}`}
              className="block border border-border rounded-sm p-4 hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-foreground">{task.name}</span>
                {hasMultipleSources && (
                  <span className="text-[10px] text-muted-foreground font-sans px-1.5 py-0.5 bg-popover rounded-sm">
                    {task.source}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground font-sans mt-1">
                {task.runCount} run{task.runCount !== 1 ? "s" : ""}
                {task.latestRun && (
                  <>
                    {" \u00b7 Latest: "}
                    <span className="font-mono">{task.latestRun.model}</span>
                    {task.latestRun.successRate !== null && (
                      <>
                        {" \u00b7 SR "}
                        <span className="font-mono">
                          {(task.latestRun.successRate * 100).toFixed(1)}%
                        </span>
                      </>
                    )}
                    {" \u00b7 "}
                    {timeAgo(task.latestRun.date)}
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent runs table */}
      <div>
        <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-3">
          Recent Runs
        </div>
        <div className="border border-border rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-popover">
                <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Task</th>
                {hasMultipleSources && (
                  <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Source</th>
                )}
                <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Model</th>
                <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">SR</th>
                <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Episodes</th>
                <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentRuns.map((run, idx) => (
                <tr
                  key={`${run.sourcePath}:${run.task}-${run.runId}`}
                  className={`border-b border-border hover:bg-accent transition-colors cursor-pointer ${idx % 2 === 1 ? "bg-card" : "bg-transparent"}`}
                  onClick={() => router.push(`/task/${encodeURIComponent(run.task)}/${encodeURIComponent(run.runId)}?source=${encodeURIComponent(run.sourcePath)}`)}
                >
                  <td className="px-4 py-2 font-mono text-primary text-xs">{run.task}</td>
                  {hasMultipleSources && (
                    <td className="px-4 py-2 text-xs text-muted-foreground">{run.source}</td>
                  )}
                  <td className="px-4 py-2 font-mono text-xs">{run.model}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">
                    {run.successRate !== null ? `${(run.successRate * 100).toFixed(1)}%` : "\u2014"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs">
                    {run.numEpisodes !== null ? run.numEpisodes : "\u2014"}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {timeAgo(run.date)}
                  </td>
                </tr>
              ))}
              {data.recentRuns.length === 0 && (
                <tr>
                  <td colSpan={hasMultipleSources ? 6 : 5} className="px-4 py-8 text-center text-muted-foreground">
                    No runs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
