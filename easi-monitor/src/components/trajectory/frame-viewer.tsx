"use client";

import { useEffect, useRef, useState } from "react";
import { PlaybackControls } from "./playback-controls";
import { TimelineMarkers } from "./timeline-markers";
import { frameCache } from "@/lib/frame-cache";
import { Loader2 } from "lucide-react";
import type { TrajectoryStep } from "@/types/easi";

interface Props {
  task: string;
  run: string;
  ep: string;
  trajectory: TrajectoryStep[];
  camera: string;
  currentStep: number;
  onStepChange: (step: number) => void;
}

export function FrameViewer({ task, run, ep, trajectory, camera, currentStep, onStepChange }: Props) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const maxStep = Math.max(0, trajectory.length - 1);
  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;

  // The displayed frame URL — may lag behind currentStep while loading
  const [displayUrl, setDisplayUrl] = useState<string>("");

  // Load current frame: use blob cache if available, otherwise fetch it
  useEffect(() => {
    const cached = frameCache.getCachedUrl(task, run, ep, currentStep, camera);
    if (cached) {
      setDisplayUrl(cached);
    } else {
      // Set API URL immediately (browser can start loading)
      setDisplayUrl(frameCache.makeUrl(task, run, ep, currentStep, camera));
      // Also fetch as blob for future cache hits
      frameCache.fetchFrame(task, run, ep, currentStep, camera).then((blobUrl) => {
        // Only update if still on the same step
        if (currentStepRef.current === currentStep) {
          setDisplayUrl(blobUrl);
        }
      });
    }
  }, [task, run, ep, currentStep, camera]);

  // Debounced prefetch — only fires 150ms after last step change
  useEffect(() => {
    frameCache.schedulePrefetch(task, run, ep, currentStep, maxStep, camera);
  }, [task, run, ep, currentStep, maxStep, camera]);

  // Single playback interval
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const next = currentStepRef.current + 1;
      if (next > maxStep) {
        setPlaying(false);
      } else {
        onStepChange(next);
      }
    }, 1000 / speed);
    return () => clearInterval(id);
  }, [playing, speed, maxStep, onStepChange]);

  return (
    <div className="space-y-3">
      <div className="aspect-video bg-card rounded-sm overflow-hidden flex items-center justify-center border border-border">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={`Step ${currentStep}`}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading frame...
          </div>
        )}
      </div>
      <TimelineMarkers trajectory={trajectory} onStepClick={onStepChange} />
      <PlaybackControls
        currentStep={currentStep}
        maxStep={maxStep}
        playing={playing}
        speed={speed}
        onStepChange={onStepChange}
        onPlayPause={() => setPlaying(!playing)}
        onSpeedChange={setSpeed}
      />
    </div>
  );
}
