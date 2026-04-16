"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEpisodes } from "@/lib/hooks";
import { MetricsPanel } from "@/components/dashboard/metrics-panel";
import { EpisodeList } from "@/components/dashboard/episode-list";
import { EpisodeCards } from "@/components/dashboard/episode-cards";
import { ViewToggle, type ViewMode } from "@/components/dashboard/view-toggle";
import {
  EpisodeFilters, type StatusFilter, type SortField, type SortDir,
} from "@/components/dashboard/episode-filters";
import { getEpisodeStatus } from "@/lib/episode-utils";
import { Home, ChevronRight, Inbox } from "lucide-react";
import type { RunSummary, RunConfig } from "@/types/easi";

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card border border-border border-l-2 rounded-sm p-3">
          <div className="h-3 w-20 bg-muted-foreground/10 rounded-sm animate-pulse mb-3" />
          <div className="h-7 w-16 bg-muted-foreground/10 rounded-sm animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function EpisodesSkeleton() {
  return (
    <div className="border rounded-sm overflow-hidden">
      <div className="bg-[#1C1C28] px-4 py-2.5">
        <div className="h-3 w-full bg-muted-foreground/10 rounded-sm animate-pulse" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b">
          <div className="h-5 w-16 bg-muted-foreground/10 rounded-sm animate-pulse" />
          <div className="h-5 w-24 bg-muted-foreground/10 rounded-sm animate-pulse" />
          <div className="h-5 flex-1 bg-muted-foreground/10 rounded-sm animate-pulse" />
          <div className="h-5 w-12 bg-muted-foreground/10 rounded-sm animate-pulse" />
          <div className="h-5 w-12 bg-muted-foreground/10 rounded-sm animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function RunDetailPage() {
  const params = useParams<{ name: string; run: string }>();
  const searchParams = useSearchParams();
  const taskName = decodeURIComponent(params.name);
  const runId = decodeURIComponent(params.run);
  const sourcePath = searchParams.get("source");

  const sourceQuery = sourcePath ? `?source=${encodeURIComponent(sourcePath)}` : "";
  const sourceParam = sourcePath ? `&source=${encodeURIComponent(sourcePath)}` : "";

  const { episodes, loading: episodesLoading } = useEpisodes(taskName, runId, sourcePath);

  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [config, setConfig] = useState<RunConfig | null>(null);
  const [runLoading, setRunLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("episode");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    fetch(`/api/run?task=${encodeURIComponent(taskName)}&run=${encodeURIComponent(runId)}${sourceParam}`)
      .then((r) => r.json())
      .then((data) => {
        setSummary(data.summary ?? null);
        setConfig(data.config ?? null);
      })
      .catch(console.error)
      .finally(() => setRunLoading(false));
  }, [taskName, runId, sourceParam]);

  const model = config?.cli_options?.model
    ? config.cli_options.model.split("/").pop() ?? runId
    : runId;

  const filteredEpisodes = episodes
    .filter((ep) => statusFilter === "all" || getEpisodeStatus(ep) === statusFilter)
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "steps":
          return dir * (((a.result?.num_steps as number) ?? 0) - ((b.result?.num_steps as number) ?? 0));
        case "time":
          return dir * ((a.result?.elapsed_seconds ?? 0) - (b.result?.elapsed_seconds ?? 0));
        case "success": {
          const sa = (a.result?.task_success ?? 0) as number;
          const sb = (b.result?.task_success ?? 0) as number;
          return dir * (sa - sb);
        }
        default:
          return dir * a.episodeDir.localeCompare(b.episodeDir);
      }
    });

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground flex items-center gap-1">
          <Home className="size-3.5" />
          Home
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href={`/task/${encodeURIComponent(taskName)}${sourceQuery}`} className="hover:text-foreground">
          {taskName}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="font-mono text-foreground">{model}</span>
      </div>

      {/* Metrics panel */}
      <div className="border border-border rounded-sm p-4 space-y-4">
        <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
          Run Summary
        </div>
        {runLoading ? <MetricsSkeleton /> : <MetricsPanel summary={summary} />}
      </div>

      {/* Episodes */}
      <div className="border border-border rounded-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            {episodesLoading ? "Loading episodes..." : <>Episodes &middot; {filteredEpisodes.length} of {episodes.length}</>}
          </div>
          <div className="flex gap-3 items-center">
            <EpisodeFilters
              status={statusFilter} onStatusChange={setStatusFilter}
              sortField={sortField} onSortFieldChange={setSortField}
              sortDir={sortDir} onSortDirChange={setSortDir}
            />
            <ViewToggle mode={viewMode} onChange={setViewMode} />
          </div>
        </div>
        {episodesLoading ? (
          <EpisodesSkeleton />
        ) : filteredEpisodes.length === 0 && episodes.length > 0 ? (
          <div className="text-center py-12 border rounded-sm">
            <Inbox className="size-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No episodes match the current filters.</p>
          </div>
        ) : viewMode === "list" ? (
          <EpisodeList episodes={filteredEpisodes} task={taskName} run={runId} sourcePath={sourcePath} />
        ) : (
          <EpisodeCards episodes={filteredEpisodes} task={taskName} run={runId} sourcePath={sourcePath} />
        )}
      </div>
    </div>
  );
}
