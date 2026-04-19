"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";

interface ExportJob {
  id: string;
  task: string;
  run: string;
  ep: string;
  sourcePath: string | null;
  fps: number;
  status: "pending" | "exporting" | "done" | "error";
  progress: { current: number; total: number } | null;
  fileId: string | null;
  filename: string;
  error: string | null;
}

interface ExportContextType {
  jobs: ExportJob[];
  startExport: (task: string, run: string, ep: string, sourcePath: string | null, fps: number) => void;
  downloadJob: (id: string) => void;
  retryJob: (id: string) => void;
  dismissJob: (id: string) => void;
  getJobForEpisode: (task: string, run: string, ep: string) => ExportJob | undefined;
  setActiveEpisode: (id: string | null) => void;
}

const ExportContext = createContext<ExportContextType | null>(null);

export function useExportQueue() {
  const ctx = useContext(ExportContext);
  if (!ctx) throw new Error("useExportQueue must be used within ExportProvider");
  return ctx;
}

async function triggerDownload(fileId: string, filename: string) {
  try {
    const resp = await fetch("/api/export-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId }),
    });
    if (!resp.ok) return;
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    /* silent */
  }
}

export function ExportProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const activeEpisodeRef = useRef<string | null>(null);

  const updateJob = useCallback((id: string, updates: Partial<ExportJob>) => {
    setJobs(prev => prev.map(j => (j.id === id ? { ...j, ...updates } : j)));
  }, []);

  const startExport = useCallback(
    (task: string, run: string, ep: string, sourcePath: string | null, fps: number) => {
      const id = `${task}__${run}__${ep}`;

      // Don't start if already running
      setJobs(prev => {
        if (prev.some(j => j.id === id && (j.status === "pending" || j.status === "exporting")))
          return prev;
        // Remove old completed/errored job for same episode if exists
        const filtered = prev.filter(j => j.id !== id);
        return [
          ...filtered,
          {
            id,
            task,
            run,
            ep,
            sourcePath,
            fps,
            status: "pending" as const,
            progress: null,
            fileId: null,
            filename: `${task}_${ep}.mp4`,
            error: null,
          },
        ];
      });

      // Start the SSE fetch
      const params = new URLSearchParams({ task, run, ep, fps: String(fps), stream: "true" });
      if (sourcePath) params.set("source", sourcePath);

      // Use setTimeout to ensure state is updated before starting
      setTimeout(async () => {
        updateJob(id, { status: "exporting" });
        try {
          const resp = await fetch(`/api/export-video?${params}`);
          if (!resp.ok) {
            updateJob(id, { status: "error", error: `HTTP ${resp.status}` });
            return;
          }
          const reader = resp.body?.getReader();
          if (!reader) {
            updateJob(id, { status: "error", error: "No response body" });
            return;
          }

          const decoder = new TextDecoder();
          let buffer = "";
          let fileId = "";
          let filename = `${task}_${ep}.mp4`;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const match = line.match(/^data: (.+)$/);
              if (!match) continue;
              const event = JSON.parse(match[1]);
              if (event.type === "progress") {
                updateJob(id, { progress: { current: event.current, total: event.total } });
              } else if (event.type === "done") {
                fileId = event.fileId;
                filename = event.filename;
              } else if (event.type === "error") {
                updateJob(id, { status: "error", error: event.message });
                return;
              }
            }
          }

          if (fileId) {
            updateJob(id, { status: "done", fileId, filename });
            // Auto-download if user is still on the same episode page
            if (activeEpisodeRef.current === id) {
              triggerDownload(fileId, filename);
            }
          }
        } catch (e) {
          updateJob(id, {
            status: "error",
            error: e instanceof Error ? e.message : "Unknown error",
          });
        }
      }, 0);
    },
    [updateJob],
  );

  const downloadJob = useCallback(
    (id: string) => {
      const job = jobs.find(j => j.id === id);
      if (!job?.fileId) return;
      triggerDownload(job.fileId, job.filename);
    },
    [jobs],
  );

  const retryJob = useCallback(
    (id: string) => {
      const job = jobs.find(j => j.id === id);
      if (!job) return;
      startExport(job.task, job.run, job.ep, job.sourcePath, job.fps);
    },
    [jobs, startExport],
  );

  const dismissJob = useCallback((id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  }, []);

  const getJobForEpisode = useCallback(
    (task: string, run: string, ep: string) => {
      const id = `${task}__${run}__${ep}`;
      return jobs.find(j => j.id === id);
    },
    [jobs],
  );

  const setActiveEpisode = useCallback((id: string | null) => {
    activeEpisodeRef.current = id;
  }, []);

  const value: ExportContextType = {
    jobs,
    startExport,
    downloadJob,
    retryJob,
    dismissJob,
    getJobForEpisode,
    setActiveEpisode,
  };

  return <ExportContext.Provider value={value}>{children}</ExportContext.Provider>;
}
