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
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  sourcePath?: string | null;
  hideControls?: boolean;
  speed?: number;
}

export function FrameViewer({ task, run, ep, trajectory, camera, currentStep, onStepChange, playing, onPlayingChange, sourcePath, hideControls, speed = 1 }: Props) {
  const maxStep = Math.max(0, trajectory.length - 1);
  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;

  // The displayed frame URL — may lag behind currentStep while loading
  const [displayUrl, setDisplayUrl] = useState<string>("");

  // Load current frame: use blob cache if available, otherwise fetch it
  useEffect(() => {
    const cached = frameCache.getCachedUrl(task, run, ep, currentStep, camera, sourcePath);
    if (cached) {
      setDisplayUrl(cached);
    } else {
      // Set API URL immediately (browser can start loading)
      setDisplayUrl(frameCache.makeUrl(task, run, ep, currentStep, camera, sourcePath));
      // Also fetch as blob for future cache hits
      frameCache.fetchFrame(task, run, ep, currentStep, camera, sourcePath).then((blobUrl) => {
        // Only update if still on the same step
        if (currentStepRef.current === currentStep) {
          setDisplayUrl(blobUrl);
        }
      });
    }
  }, [task, run, ep, currentStep, camera, sourcePath]);

  // Debounced prefetch — biases forward during playback, scales with speed
  useEffect(() => {
    frameCache.schedulePrefetch(task, run, ep, currentStep, maxStep, camera, 15, sourcePath, playing, speed);
  }, [task, run, ep, currentStep, maxStep, camera, sourcePath, playing, speed]);

  // Single playback interval
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const next = currentStepRef.current + 1;
      if (next > maxStep) {
        onPlayingChange(false);
      } else {
        onStepChange(next);
      }
    }, 1000 / speed);
    return () => clearInterval(id);
  }, [playing, speed, maxStep, onStepChange, onPlayingChange]);

  return (
    <div className="space-y-3">
      {/* Frame image only — no aspect-video, use aspect-square since frames are 512x512 */}
      <div className="relative aspect-square bg-card rounded-sm overflow-hidden flex items-center justify-center border border-border">
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
        <div className="absolute top-2 right-2 bg-background/80 text-[10px] font-mono text-muted-foreground px-2 py-1 rounded-sm">
          {currentStep} / {maxStep}
        </div>
      </div>
      {/* Controls rendered separately when in side-by-side mode */}
      {!hideControls && (
        <>
          <TimelineMarkers trajectory={trajectory} onStepClick={onStepChange} />
          <PlaybackControls
            currentStep={currentStep}
            maxStep={maxStep}
            playing={playing}
            speed={speed}
            onStepChange={onStepChange}
            onPlayPause={() => onPlayingChange(!playing)}
            onSpeedChange={() => {}}
          />
        </>
      )}
    </div>
  );
}
