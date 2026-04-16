"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Home, ChevronRight } from "lucide-react";
import { useTrajectory, useEpisodeMeta } from "@/lib/hooks";
import { FrameViewer } from "@/components/trajectory/frame-viewer";
import { MapOverlay } from "@/components/trajectory/map-overlay";
import { TimelineMarkers } from "@/components/trajectory/timeline-markers";
import { PlaybackControls } from "@/components/trajectory/playback-controls";
import { MetadataPanel } from "@/components/trajectory/metadata-panel";
import { EpisodeHeader } from "@/components/trajectory/episode-header";
import type { RunConfig } from "@/types/easi";

export default function EpisodePage() {
  const params = useParams<{ task: string; run: string; ep: string }>();
  const searchParams = useSearchParams();
  const task = decodeURIComponent(params.task);
  const run = decodeURIComponent(params.run);
  const ep = decodeURIComponent(params.ep);
  const sourcePath = searchParams.get("source");

  const sourceQuery = sourcePath ? `?source=${encodeURIComponent(sourcePath)}` : "";
  const sourceParam = sourcePath ? `&source=${encodeURIComponent(sourcePath)}` : "";

  const { trajectory, loading } = useTrajectory(task, run, ep, sourcePath);
  const episodeMeta = useEpisodeMeta(task, run, ep, sourcePath);
  const sceneId = episodeMeta?.scene ? String(episodeMeta.scene) : null;
  const [currentStep, setCurrentStep] = useState(0);
  const [camera, setCamera] = useState("front");
  const [config, setConfig] = useState<RunConfig | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [episodeInstruction, setEpisodeInstruction] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch(`/api/run?task=${encodeURIComponent(task)}&run=${encodeURIComponent(run)}${sourceParam}`)
      .then((r) => r.json())
      .then((data) => setConfig(data.config ?? null))
      .catch(console.error);

    fetch(`/api/episodes?task=${encodeURIComponent(task)}&run=${encodeURIComponent(run)}${sourceParam}`)
      .then((r) => r.json())
      .then((eps: Array<{ episodeDir: string; result: { instruction?: string } | null }>) => {
        const found = eps.find((e) => e.episodeDir === ep);
        if (found?.result?.instruction) setEpisodeInstruction(found.result.instruction);
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
          {run}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="font-mono text-foreground">{ep}</span>
      </div>

      <EpisodeHeader task={task} run={run} ep={ep} sourcePath={sourcePath} />

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
