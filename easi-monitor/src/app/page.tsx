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
import { getEpisodeStatus } from "@/lib/episode-utils";

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
    return <div className="text-muted-foreground">Loading tasks...</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold mb-2">No tasks found</h2>
        <p className="text-muted-foreground">
          Set EASI_LOGS_DIR environment variable to point to your evaluation logs directory.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-center">
        <TaskSelector tasks={tasks} selected={selectedTask} onSelect={handleTaskChange} />
        {selectedTask && (
          <RunSelector runs={runs} selected={selectedRun} onSelect={setSelectedRun} />
        )}
      </div>

      {currentRun && <MetricsPanel summary={currentRun.summary} />}

      {selectedTask && runs.length > 1 && <MetricsChart runs={runs} />}

      {selectedRun && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
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
          {viewMode === "list" ? (
            <EpisodeList episodes={filteredEpisodes} task={selectedTask!} run={selectedRun} />
          ) : (
            <EpisodeCards episodes={filteredEpisodes} task={selectedTask!} run={selectedRun} />
          )}
        </div>
      )}
    </div>
  );
}
