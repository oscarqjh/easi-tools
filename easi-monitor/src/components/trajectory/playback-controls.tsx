"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SkipBack, ChevronLeft, Play, Pause, ChevronRight, SkipForward } from "lucide-react";

interface Props {
  currentStep: number;
  maxStep: number;
  playing: boolean;
  speed: number;
  onStepChange: (step: number) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
}

export function PlaybackControls({
  currentStep, maxStep, playing, speed,
  onStepChange, onPlayPause, onSpeedChange,
}: Props) {
  return (
    <div className="space-y-2">
      <Slider
        value={currentStep}
        min={0}
        max={maxStep > 0 ? maxStep : 1}
        step={1}
        disabled={maxStep === 0}
        onValueChange={(v) => onStepChange(v as number)}
        className="w-full"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 border rounded-sm p-1">
          <Button size="icon-sm" variant="ghost" className="rounded-sm" onClick={() => onStepChange(0)}>
            <SkipBack className="size-3.5" />
          </Button>
          <Button size="icon-sm" variant="ghost" className="rounded-sm" onClick={() => onStepChange(Math.max(0, currentStep - 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button size="icon-sm" variant="default" className="rounded-sm" onClick={onPlayPause}>
            {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </Button>
          <Button size="icon-sm" variant="ghost" className="rounded-sm" onClick={() => onStepChange(Math.min(maxStep, currentStep + 1))}>
            <ChevronRight className="size-4" />
          </Button>
          <Button size="icon-sm" variant="ghost" className="rounded-sm" onClick={() => onStepChange(maxStep)}>
            <SkipForward className="size-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-muted-foreground">{currentStep} / {maxStep}</span>
          <div className="flex gap-1">
            {[1, 2, 5, 10].map((s) => (
              <Button key={s} size="sm" variant={speed === s ? "secondary" : "ghost"} className="rounded-sm" onClick={() => onSpeedChange(s)}>
                {s}x
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
