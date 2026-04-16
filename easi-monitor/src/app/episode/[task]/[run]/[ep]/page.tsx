"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Home, ChevronRight } from "lucide-react";
import { useTrajectory } from "@/lib/hooks";
import { FrameViewer } from "@/components/trajectory/frame-viewer";
import { MetadataPanel } from "@/components/trajectory/metadata-panel";
import { EpisodeHeader } from "@/components/trajectory/episode-header";
import type { RunConfig } from "@/types/easi";

export default function EpisodePage() {
  const params = useParams<{ task: string; run: string; ep: string }>();
  const task = decodeURIComponent(params.task);
  const run = decodeURIComponent(params.run);
  const ep = decodeURIComponent(params.ep);

  const { trajectory, loading } = useTrajectory(task, run, ep);
  const [currentStep, setCurrentStep] = useState(0);
  const [camera, setCamera] = useState("front");
  const [config, setConfig] = useState<RunConfig | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    fetch(`/api/run?task=${encodeURIComponent(task)}&run=${encodeURIComponent(run)}`)
      .then((r) => r.json())
      .then((data) => setConfig(data.config ?? null))
      .catch(console.error);
  }, [task, run]);

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
          Dashboard
        </Link>
        <ChevronRight className="size-3.5" />
        <span>{task}</span>
        <ChevronRight className="size-3.5" />
        <span className="font-mono">{run}</span>
        <ChevronRight className="size-3.5" />
        <span className="font-mono text-foreground">{ep}</span>
      </div>

      <EpisodeHeader task={task} run={run} ep={ep} />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-3">
          <FrameViewer
            task={task} run={run} ep={ep}
            trajectory={trajectory}
            camera={camera}
            currentStep={currentStep}
            onStepChange={handleStepChange}
            playing={playing}
            onPlayingChange={setPlaying}
          />
          <div className="text-[10px] text-muted-foreground/50 font-mono mt-2">
            &larr; &rarr; step &middot; space play/pause
          </div>
        </div>
        <div className="md:col-span-2">
          <MetadataPanel
            step={currentData}
            totalSteps={trajectory.length}
            config={config}
            trajectory={trajectory}
            currentStepIndex={currentStep}
          />
        </div>
      </div>
    </div>
  );
}
