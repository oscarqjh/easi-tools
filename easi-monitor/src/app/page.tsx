"use client";

import { useState } from "react";
import { useTasks, useRuns, useEpisodes } from "@/lib/hooks";
import { TaskSelector } from "@/components/dashboard/task-selector";
import { RunSelector } from "@/components/dashboard/run-selector";
import { MetricsPanel } from "@/components/dashboard/metrics-panel";
import { MetricsChart } from "@/components/dashboard/metrics-chart";
import { EpisodeList } from "@/components/dashboard/episode-list";
import { EpisodeCards } from "@/components/dashboard/episode-cards";
import { ViewToggle, type ViewMode } from "@/components/dashboard/view-toggle";
import {
  EpisodeFilters, type StatusFilter, type SortField, type SortDir,
} from "@/components/dashboard/episode-filters";
import { Card } from "@/components/ui/card";
import { getEpisodeStatus } from "@/lib/episode-utils";
import { Inbox } from "lucide-react";

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-4 rounded-sm">
          <div className="h-3 w-20 bg-card rounded-sm animate-pulse mb-3" />
          <div className="h-7 w-16 bg-card rounded-sm animate-pulse" />
        </Card>
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
          <div className="h-5 w-16 bg-card rounded-sm animate-pulse" />
          <div className="h-5 w-24 bg-card rounded-sm animate-pulse" />
          <div className="h-5 flex-1 bg-card rounded-sm animate-pulse" />
          <div className="h-5 w-12 bg-card rounded-sm animate-pulse" />
          <div className="h-5 w-12 bg-card rounded-sm animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { tasks, loading: tasksLoading } = useTasks();
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const { runs, loading: runsLoading } = useRuns(selectedTask);
  const { episodes, loading: episodesLoading } = useEpisodes(selectedTask, selectedRun);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("episode");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const currentRun = runs.find((r) => r.runId === selectedRun);

  function handleTaskChange(task: string) {
    setSelectedTask(task);
    setSelectedRun(null);
  }

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

  if (tasksLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-8 bg-card rounded-sm animate-pulse" />
            <div className="h-8 w-[300px] bg-card rounded-sm animate-pulse" />
          </div>
        </div>
        <MetricsSkeleton />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-20">
        <Inbox className="size-12 text-muted-foreground/50 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">No tasks found</h2>
        <p className="text-muted-foreground">
          Set EASI_LOGS_DIR environment variable to point to your evaluation logs directory.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <TaskSelector tasks={tasks} selected={selectedTask} onSelect={handleTaskChange} />
        {selectedTask && (
          <RunSelector runs={runs} selected={selectedRun} onSelect={setSelectedRun} />
        )}
      </div>

      {selectedRun && !currentRun && <MetricsSkeleton />}
      {currentRun && <MetricsPanel summary={currentRun.summary} />}

      {selectedTask && runs.length > 1 && <MetricsChart runs={runs} />}

      {selectedRun && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-widest font-mono text-muted-foreground">
              {episodesLoading ? "Loading episodes..." : `${filteredEpisodes.length} of ${episodes.length} episodes`}
            </div>
            <div className="flex gap-4 items-center">
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
            <EpisodeList episodes={filteredEpisodes} task={selectedTask!} run={selectedRun} />
          ) : (
            <EpisodeCards episodes={filteredEpisodes} task={selectedTask!} run={selectedRun} />
          )}
        </div>
      )}
    </div>
  );
}
