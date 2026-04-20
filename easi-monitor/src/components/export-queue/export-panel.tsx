"use client";

import { useExportQueue } from "./export-context";
import {
  Download,
  X,
  RotateCcw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { useState } from "react";

export function ExportPanel() {
  const { jobs, downloadJob, retryJob, dismissJob } = useExportQueue();
  const [minimized, setMinimized] = useState(false);

  // Only show when there are jobs
  if (jobs.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 border border-border rounded-sm bg-card w-80"
      style={{ fontVariantLigatures: "none" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
          Exports ({jobs.length})
        </span>
        <button
          onClick={() => setMinimized(!minimized)}
          className="text-muted-foreground hover:text-foreground"
        >
          {minimized ? <Maximize2 className="size-3.5" /> : <Minimize2 className="size-3.5" />}
        </button>
      </div>

      {/* Job list */}
      {!minimized && (
        <div className="max-h-60 overflow-auto">
          {jobs.map(job => (
            <div key={job.id} className="px-3 py-2 border-b border-border last:border-b-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-foreground truncate max-w-[180px]">
                  {job.ep}
                </span>
                <div className="flex items-center gap-1">
                  {job.status === "done" && (
                    <button
                      onClick={() => downloadJob(job.id)}
                      className="text-primary hover:text-foreground"
                      title="Download"
                    >
                      <Download className="size-3.5" />
                    </button>
                  )}
                  {job.status === "error" && (
                    <button
                      onClick={() => retryJob(job.id)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Retry"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>
                  )}
                  {(job.status === "done" || job.status === "error") && (
                    <button
                      onClick={() => dismissJob(job.id)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Dismiss"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {/* Progress bar */}
              {job.status === "exporting" && job.progress && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-popover rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-sm transition-all"
                      style={{
                        width: `${(job.progress.current / job.progress.total) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {job.progress.current}/{job.progress.total}
                  </span>
                </div>
              )}
              {/* Status */}
              <div className="flex items-center gap-1 mt-1">
                {job.status === "pending" && (
                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                )}
                {job.status === "exporting" && (
                  <Loader2 className="size-3 animate-spin text-primary" />
                )}
                {job.status === "done" && <CheckCircle className="size-3 text-success" />}
                {job.status === "error" && <AlertCircle className="size-3 text-destructive" />}
                <span className="text-[10px] text-muted-foreground font-mono">
                  {job.status === "pending" && "Queued..."}
                  {job.status === "exporting" && "Exporting..."}
                  {job.status === "done" && "Ready to download"}
                  {job.status === "error" && (job.error?.slice(0, 50) ?? "Failed")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
