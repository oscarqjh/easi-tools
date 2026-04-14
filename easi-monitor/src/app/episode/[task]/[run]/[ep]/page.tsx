"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTrajectory } from "@/lib/hooks";
import { FrameViewer } from "@/components/trajectory/frame-viewer";
import { MetadataPanel } from "@/components/trajectory/metadata-panel";
import { EpisodeHeader } from "@/components/trajectory/episode-header";

export default function EpisodePage() {
  const params = useParams<{ task: string; run: string; ep: string }>();
  const task = decodeURIComponent(params.task);
  const run = decodeURIComponent(params.run);
  const ep = decodeURIComponent(params.ep);

  const { trajectory, loading } = useTrajectory(task, run, ep);
  const [currentStep, setCurrentStep] = useState(0);
  const [camera, setCamera] = useState("front");

  const handleStepChange = useCallback((s: number) => {
    setCurrentStep(Math.max(0, Math.min(s, (trajectory.length || 1) - 1)));
  }, [trajectory.length]);

  const currentData = trajectory[currentStep] ?? null;

  if (loading) {
    return <div className="text-muted-foreground">Loading trajectory...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Dashboard</Link>
        <span>/</span>
        <span>{task}</span>
        <span>/</span>
        <span className="font-mono">{run}</span>
        <span>/</span>
        <span className="font-mono">{ep}</span>
      </div>

      <EpisodeHeader task={task} run={run} ep={ep} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <FrameViewer
            task={task} run={run} ep={ep}
            trajectory={trajectory}
            camera={camera}
            currentStep={currentStep}
            onStepChange={handleStepChange}
          />
        </div>
        <div className="lg:col-span-2">
          <MetadataPanel step={currentData} totalSteps={trajectory.length} />
        </div>
      </div>
    </div>
  );
}
