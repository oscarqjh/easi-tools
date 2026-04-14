"use client";

import type { TrajectoryStep } from "@/types/easi";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  trajectory: TrajectoryStep[];
  onStepClick: (step: number) => void;
}

interface Marker {
  step: number;
  type: "fallback" | "subtask" | "done";
  label: string;
}

export function TimelineMarkers({ trajectory, onStepClick }: Props) {
  if (trajectory.length === 0) return null;
  const maxStep = trajectory.length - 1;

  const markers: Marker[] = [];
  let prevSubtaskStage = 0;

  for (const entry of trajectory) {
    if (entry.type !== "step") continue;
    if (entry.triggered_fallback) {
      markers.push({ step: entry.step, type: "fallback", label: `Fallback at step ${entry.step}` });
    }
    const stage = Number(entry.info?.subtask_stage ?? 0);
    if (stage > prevSubtaskStage) {
      markers.push({ step: entry.step, type: "subtask", label: `Subtask ${stage} completed at step ${entry.step}` });
    }
    prevSubtaskStage = stage;
    if (entry.done) {
      markers.push({ step: entry.step, type: "done", label: `Episode ended at step ${entry.step}` });
    }
  }

  if (markers.length === 0) return null;

  const colors = { fallback: "bg-red-500", subtask: "bg-green-500", done: "bg-blue-500" };

  return (
    <TooltipProvider>
      <div className="space-y-1">
        <div className="relative h-3 w-full">
          {markers.map((m, i) => (
            <Tooltip key={`${m.type}-${m.step}-${i}`}>
              <TooltipTrigger
                className={`absolute top-0 w-2 h-3 rounded-sm ${colors[m.type]} hover:opacity-80`}
                style={{ left: `${(m.step / maxStep) * 100}%`, transform: "translateX(-50%)" }}
                onClick={() => onStepClick(m.step)}
              />
              <TooltipContent><p className="text-xs">{m.label}</p></TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" /> Fallback</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" /> Subtask</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" /> End</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
