"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Home, ChevronRight, Download, Loader2, Columns2 } from "lucide-react";
import { useTrajectory, useEpisodeMeta } from "@/lib/hooks";
import { FrameViewer } from "@/components/trajectory/frame-viewer";
import { MapOverlay } from "@/components/trajectory/map-overlay";
import { TimelineMarkers } from "@/components/trajectory/timeline-markers";
import { PlaybackControls } from "@/components/trajectory/playback-controls";
import { MetadataPanel } from "@/components/trajectory/metadata-panel";
import { EpisodeHeader } from "@/components/trajectory/episode-header";
import { formatRunLabel } from "@/lib/episode-utils";
import type { RunConfig, EpisodeResult } from "@/types/easi";

export default function EpisodePage() {
  const params = useParams<{ task: string; run: string; ep: string }>();
  const searchParams = useSearchParams();
  const task = decodeURIComponent(params.task);
  const run = decodeURIComponent(params.run);
  const ep = decodeURIComponent(params.ep);
  const sourcePath = searchParams.get("source");

  const sourceQuery = sourcePath ? `?source=${encodeURIComponent(sourcePath)}` : "";
  const sourceParam = sourcePath ? `&source=${encodeURIComponent(sourcePath)}` : "";

  const { trajectory, loading, error: trajectoryError } = useTrajectory(task, run, ep, sourcePath);
  const { meta: episodeMeta } = useEpisodeMeta(task, run, ep, sourcePath);
  const sceneId = episodeMeta?.scene ? String(episodeMeta.scene) : null;
  const [currentStep, setCurrentStep] = useState(0);
  const [camera, setCamera] = useState("front");
  const [config, setConfig] = useState<RunConfig | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [episodeInstruction, setEpisodeInstruction] = useState<string | undefined>(undefined);
  const [episodeResult, setEpisodeResult] = useState<EpisodeResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportFps, setExportFps] = useState(5);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    fetch(`/api/run?task=${encodeURIComponent(task)}&run=${encodeURIComponent(run)}${sourceParam}`)
      .then((r) => r.json())
      .then((data) => setConfig(data.config ?? null))
      .catch(console.error);

    fetch(`/api/episodes?task=${encodeURIComponent(task)}&run=${encodeURIComponent(run)}${sourceParam}`)
      .then((r) => r.json())
      .then((eps: Array<{ episodeDir: string; result: EpisodeResult | null }>) => {
        const found = eps.find((e) => e.episodeDir === ep);
        if (found?.result) {
          setEpisodeResult(found.result);
          if (found.result.instruction) setEpisodeInstruction(found.result.instruction as string);
        }
      })
      .catch(console.error);
  }, [task, run, ep, sourceParam]);

  const handleStepChange = useCallback((s: number) => {
    setCurrentStep(Math.max(0, Math.min(s, (trajectory.length || 1) - 1)));
  }, [trajectory.length]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          handleStepChange(currentStep - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          handleStepChange(currentStep + 1);
          break;
        case " ":
          e.preventDefault();
          setPlaying((p) => !p);
          break;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, handleStepChange]);

  const currentData = trajectory[currentStep] ?? null;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-96 bg-card rounded-sm animate-pulse" />
        <div className="border rounded-sm p-5 space-y-3">
          <div className="h-5 w-48 bg-card rounded-sm animate-pulse" />
          <div className="h-4 w-full bg-card rounded-sm animate-pulse" />
          <div className="h-4 w-2/3 bg-card rounded-sm animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-3">
            <div className="aspect-video bg-card rounded-sm animate-pulse" />
          </div>
          <div className="md:col-span-2">
            <div className="h-96 bg-card rounded-sm animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (trajectoryError) {
    return (
      <div className="text-center py-20">
        <div className="text-destructive text-sm font-mono">Failed to load trajectory: {trajectoryError}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground flex items-center gap-1">
          <Home className="size-3.5" />
          Home
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href={`/task/${encodeURIComponent(task)}${sourceQuery}`} className="hover:text-foreground">
          {task}
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href={`/task/${encodeURIComponent(task)}/${encodeURIComponent(run)}${sourceQuery}`} className="hover:text-foreground font-mono">
          {formatRunLabel(run, config?.cli_options?.model)}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="font-mono text-foreground">{ep}</span>
      </div>

      <div className="flex items-center justify-between">
        <EpisodeHeader task={task} run={run} ep={ep} sourcePath={sourcePath} config={config} result={episodeResult} />
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={`/compare/${encodeURIComponent(task)}/${encodeURIComponent(ep)}?left=${encodeURIComponent(run)}${sourcePath ? `&source=${encodeURIComponent(sourcePath)}` : ""}`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border border-border rounded-sm hover:bg-[#252535] transition-colors text-muted-foreground"
        >
          <Columns2 className="size-3.5" />
          Compare
        </Link>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">FPS</span>
          <div className="flex gap-0.5">
            {[3, 5, 10].map((f) => (
              <button
                key={f}
                onClick={() => setExportFps(f)}
                disabled={exporting}
                className={`px-2 py-0.5 text-xs font-mono rounded-sm border transition-colors ${
                  exportFps === f
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:bg-[#252535]"
                } disabled:opacity-50`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <button
          disabled={exporting}
          onClick={async () => {
            setExporting(true);
            setExportProgress(null);
            try {
              const params = new URLSearchParams({ task, run, ep, fps: String(exportFps), stream: "true" });
              if (sourcePath) params.set("source", sourcePath);
              const resp = await fetch(`/api/export-video?${params}`);
              if (!resp.ok) {
                const err = await resp.json();
                alert(`Export failed: ${err.error}`);
                return;
              }
              const reader = resp.body?.getReader();
              if (!reader) throw new Error("No response body");
              const decoder = new TextDecoder();
              let fileId = "";
              let filename = `${task}_${ep}.mp4`;
              let buffer = "";
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
                    setExportProgress({ current: event.current, total: event.total });
                  } else if (event.type === "done") {
                    fileId = event.fileId;
                    filename = event.filename;
                  } else if (event.type === "error") {
                    alert(`Export failed: ${event.message}`);
                    return;
                  }
                }
              }
              if (fileId) {
                const dlResp = await fetch("/api/export-video", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ fileId }),
                });
                if (!dlResp.ok) throw new Error("Failed to download");
                const blob = await dlResp.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
              }
            } catch (e) {
              alert(`Export error: ${e}`);
            } finally {
              setExporting(false);
              setExportProgress(null);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border border-border rounded-sm hover:bg-[#252535] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground"
        >
          {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          {exporting && exportProgress
            ? `${exportProgress.current}/${exportProgress.total}`
            : exporting
              ? "Starting..."
              : "Export Video"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column: frame + map side-by-side, shared controls below */}
        <div className="lg:col-span-3 space-y-3">
          {/* Frame and map row */}
          <div className={`grid gap-3 ${sceneId ? "grid-cols-2" : "grid-cols-1"}`}>
            <FrameViewer
              task={task} run={run} ep={ep}
              trajectory={trajectory}
              camera={camera}
              currentStep={currentStep}
              onStepChange={handleStepChange}
              playing={playing}
              onPlayingChange={setPlaying}
              sourcePath={sourcePath}
              hideControls
              speed={speed}
            />
            {sceneId && (
              <MapOverlay
                sceneId={sceneId}
                task={task}
                trajectory={trajectory}
                currentStep={currentStep}
                onStepClick={handleStepChange}
              />
            )}
          </div>
          {/* Shared controls below both */}
          <TimelineMarkers trajectory={trajectory} onStepClick={handleStepChange} />
          <PlaybackControls
            currentStep={currentStep}
            maxStep={Math.max(0, trajectory.length - 1)}
            playing={playing}
            speed={speed}
            onStepChange={handleStepChange}
            onPlayPause={() => setPlaying(!playing)}
            onSpeedChange={setSpeed}
          />
          <div className="text-[10px] text-muted-foreground/50 font-mono">
            &larr; &rarr; step &middot; space play/pause
          </div>
        </div>
        {/* Right column: metadata */}
        <div className="lg:col-span-2">
          <MetadataPanel
            step={currentData}
            totalSteps={trajectory.length}
            config={config}
            trajectory={trajectory}
            currentStepIndex={currentStep}
            episodeInstruction={episodeInstruction}
          />
        </div>
      </div>
    </div>
  );
}
