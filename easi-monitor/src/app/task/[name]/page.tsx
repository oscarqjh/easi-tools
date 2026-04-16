"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useRuns } from "@/lib/hooks";
import { timeAgo } from "@/lib/episode-utils";
import { MetricsChart } from "@/components/dashboard/metrics-chart";
import { Home, ChevronRight } from "lucide-react";

function RunsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-96 bg-card rounded-sm animate-pulse" />
      <div className="border border-border rounded-sm overflow-hidden">
        <div className="bg-[#1C1C28] px-4 py-2.5">
          <div className="h-3 w-full bg-muted-foreground/10 rounded-sm animate-pulse" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-border">
            <div className="h-4 w-32 bg-muted-foreground/10 rounded-sm animate-pulse" />
            <div className="h-4 w-24 bg-muted-foreground/10 rounded-sm animate-pulse" />
            <div className="h-4 w-12 bg-muted-foreground/10 rounded-sm animate-pulse" />
            <div className="h-4 w-12 bg-muted-foreground/10 rounded-sm animate-pulse" />
            <div className="h-4 w-16 bg-muted-foreground/10 rounded-sm animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TaskDetailPage() {
  const params = useParams<{ name: string }>();
  const searchParams = useSearchParams();
  const taskName = decodeURIComponent(params.name);
  const sourcePath = searchParams.get("source");
  const { runs, loading } = useRuns(taskName, sourcePath);

  const sourceQuery = sourcePath ? `?source=${encodeURIComponent(sourcePath)}` : "";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground flex items-center gap-1">
          <Home className="size-3.5" />
          Home
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="font-mono text-foreground">{taskName}</span>
      </div>

      {/* Title */}
      <h1 className="text-lg font-bold font-mono uppercase tracking-widest">{taskName}</h1>

      {loading ? (
        <RunsSkeleton />
      ) : (
        <>
          {/* Metrics chart */}
          {runs.length > 1 && (
            <div className="border border-border rounded-sm p-4">
              <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-3">
                Run Comparison
              </div>
              <MetricsChart runs={runs} />
            </div>
          )}

          {/* Runs table */}
          <div>
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-3">
              Runs &middot; {runs.length}
            </div>
            <div className="border border-border rounded-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[#1C1C28]">
                    <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Model</th>
                    <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Date</th>
                    <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">SR</th>
                    <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Avg Steps</th>
                    <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Episodes</th>
                    <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No runs found.
                      </td>
                    </tr>
                  ) : (
                    runs.map((run, idx) => {
                      const sr = typeof run.summary?.success_rate === "number"
                        ? `${(run.summary.success_rate * 100).toFixed(1)}%`
                        : "\u2014";
                      const avgSteps = typeof run.summary?.avg_steps === "number"
                        ? String(Math.round(run.summary.avg_steps))
                        : "\u2014";
                      const episodes = typeof run.summary?.num_episodes === "number"
                        ? String(run.summary.num_episodes)
                        : "\u2014";
                      const statusLabel = run.hasSummary ? "Complete" : "In Progress";
                      const statusBg = run.hasSummary ? "bg-[#34D399]" : "bg-[#FBBF24]";

                      return (
                        <tr
                          key={run.runId}
                          className={`border-b border-border hover:bg-[#252535] transition-colors ${idx % 2 === 1 ? "bg-card" : "bg-transparent"}`}
                        >
                          <td className="px-4 py-2">
                            <Link
                              href={`/task/${encodeURIComponent(taskName)}/${encodeURIComponent(run.runId)}${sourceQuery}`}
                              className="font-mono text-primary hover:underline text-xs"
                            >
                              {run.model}
                            </Link>
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {timeAgo(run.date)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-xs">{sr}</td>
                          <td className="px-4 py-2 text-right font-mono text-xs">{avgSteps}</td>
                          <td className="px-4 py-2 text-right font-mono text-xs">{episodes}</td>
                          <td className="px-4 py-2 text-right">
                            <span className={`${statusBg} text-[#0A0A0F] text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm`}>
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
