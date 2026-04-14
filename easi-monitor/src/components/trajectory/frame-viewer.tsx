"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PlaybackControls } from "./playback-controls";
import { TimelineMarkers } from "./timeline-markers";
import { frameCache } from "@/lib/frame-cache";
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

  const frameUrl = frameCache.getUrl(task, run, ep, currentStep, camera);

  // Prefetch around current step
  useEffect(() => {
    frameCache.prefetch(task, run, ep, currentStep, maxStep, camera);
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
      <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
        <img
          src={frameUrl}
          alt={`Step ${currentStep}`}
          className="max-w-full max-h-full object-contain"
        />
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
