"use client";

import { useState, useEffect } from "react";
import type { TaskInfo, RunInfo, EpisodeInfo, TrajectoryStep, OverviewData } from "@/types/easi";

export function useOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/overview")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, []);
  return { data, loading, error };
}

export function useTasks() {
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setTasks)
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, []);
  return { tasks, loading, error };
}

export function useRuns(task: string | null, sourcePath: string | null) {
  const [runs, setRuns] = useState<RunInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!task) { setRuns([]); return; }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ task });
    if (sourcePath) params.set("source", sourcePath);
    fetch(`/api/runs?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setRuns)
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, [task, sourcePath]);
  return { runs, loading, error };
}

export function useEpisodes(task: string | null, run: string | null, sourcePath: string | null) {
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!task || !run) { setEpisodes([]); return; }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ task, run });
    if (sourcePath) params.set("source", sourcePath);
    fetch(`/api/episodes?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setEpisodes)
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, [task, run, sourcePath]);
  return { episodes, loading, error };
}

export function useEpisodeMeta(task: string | null, run: string | null, ep: string | null, sourcePath: string | null) {
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!task || !run || !ep) return;
    const params = new URLSearchParams({ task, run, ep });
    if (sourcePath) params.set("source", sourcePath);
    fetch(`/api/episode-meta?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => { if (data) setMeta(data); })
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"));
  }, [task, run, ep, sourcePath]);
  return { meta, error };
}

export function useTrajectory(task: string | null, run: string | null, ep: string | null, sourcePath: string | null) {
  const [trajectory, setTrajectory] = useState<TrajectoryStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!task || !run || !ep) { setTrajectory([]); return; }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ task, run, ep });
    if (sourcePath) params.set("source", sourcePath);
    fetch(`/api/trajectory?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setTrajectory)
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, [task, run, ep, sourcePath]);
  return { trajectory, loading, error };
}
