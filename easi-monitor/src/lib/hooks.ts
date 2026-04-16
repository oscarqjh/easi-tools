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

export function useRuns(task: string | null) {
  const [runs, setRuns] = useState<RunInfo[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!task) { setRuns([]); return; }
    setLoading(true);
    fetch(`/api/runs?task=${encodeURIComponent(task)}`)
      .then((r) => r.json())
      .then(setRuns)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [task]);
  return { runs, loading };
}

export function useEpisodes(task: string | null, run: string | null) {
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!task || !run) { setEpisodes([]); return; }
    setLoading(true);
    fetch(`/api/episodes?task=${encodeURIComponent(task)}&run=${encodeURIComponent(run)}`)
      .then((r) => r.json())
      .then(setEpisodes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [task, run]);
  return { episodes, loading };
}

export function useTrajectory(task: string | null, run: string | null, ep: string | null) {
  const [trajectory, setTrajectory] = useState<TrajectoryStep[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!task || !run || !ep) { setTrajectory([]); return; }
    setLoading(true);
    fetch(`/api/trajectory?task=${encodeURIComponent(task)}&run=${encodeURIComponent(run)}&ep=${encodeURIComponent(ep)}`)
      .then((r) => r.json())
      .then(setTrajectory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [task, run, ep]);
  return { trajectory, loading };
}
