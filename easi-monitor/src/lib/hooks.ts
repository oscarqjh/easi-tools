"use client";

import { useState, useEffect } from "react";
import type { TaskInfo, RunInfo, EpisodeInfo, TrajectoryStep, OverviewData } from "@/types/easi";

export function useOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/overview")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

export function useTasks() {
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);
  return { tasks, loading };
}

export function useRuns(task: string | null, sourcePath: string | null) {
  const [runs, setRuns] = useState<RunInfo[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!task) { setRuns([]); return; }
    setLoading(true);
    const params = new URLSearchParams({ task });
    if (sourcePath) params.set("source", sourcePath);
    fetch(`/api/runs?${params.toString()}`)
      .then((r) => r.json())
      .then(setRuns)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [task, sourcePath]);
  return { runs, loading };
}

export function useEpisodes(task: string | null, run: string | null, sourcePath: string | null) {
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!task || !run) { setEpisodes([]); return; }
    setLoading(true);
    const params = new URLSearchParams({ task, run });
    if (sourcePath) params.set("source", sourcePath);
    fetch(`/api/episodes?${params.toString()}`)
      .then((r) => r.json())
      .then(setEpisodes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [task, run, sourcePath]);
  return { episodes, loading };
}

export function useTrajectory(task: string | null, run: string | null, ep: string | null, sourcePath: string | null) {
  const [trajectory, setTrajectory] = useState<TrajectoryStep[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!task || !run || !ep) { setTrajectory([]); return; }
    setLoading(true);
    const params = new URLSearchParams({ task, run, ep });
    if (sourcePath) params.set("source", sourcePath);
    fetch(`/api/trajectory?${params.toString()}`)
      .then((r) => r.json())
      .then(setTrajectory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [task, run, ep, sourcePath]);
  return { trajectory, loading };
}
