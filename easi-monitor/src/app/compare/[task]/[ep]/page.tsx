"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, ChevronRight, ChevronLeft as ArrowLeft, ChevronRight as ArrowRight2 } from "lucide-react";
import { useRuns, useTrajectory, useEpisodeMeta, useEpisodes } from "@/lib/hooks";
import { FrameViewer } from "@/components/trajectory/frame-viewer";
import { MapOverlay } from "@/components/trajectory/map-overlay";
import { TimelineMarkers } from "@/components/trajectory/timeline-markers";
import { PlaybackControls } from "@/components/trajectory/playback-controls";
import { MetadataPanel } from "@/components/trajectory/metadata-panel";
import { formatRunLabel } from "@/lib/episode-utils";
import type { RunConfig } from "@/types/easi";

export default function ComparePage() {
  const params = useParams<{ task: string; ep: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const task = decodeURIComponent(params.task);
  const ep = decodeURIComponent(params.ep);
  const sourcePath = searchParams.get("source");
  const leftRunId = searchParams.get("left");
  const rightRunId = searchParams.get("right");

  const sourceQuery = sourcePath
    ? `&source=${encodeURIComponent(sourcePath)}`
    : "";

  // Fetch available runs for the dropdowns
  const { runs } = useRuns(task, sourcePath);

  // Episode navigation (use left run or right run for episode list)
  const { episodes: allEpisodes } = useEpisodes(task, leftRunId ?? rightRunId, sourcePath);
  const currentEpIdx = allEpisodes.findIndex(e => e.episodeDir === ep);
  const prevEp = currentEpIdx > 0 ? allEpisodes[currentEpIdx - 1] : null;
  const nextEp = currentEpIdx < allEpisodes.length - 1 ? allEpisodes[currentEpIdx + 1] : null;

  function navigateToEpisode(episodeDir: string) {
    const params = new URLSearchParams();
    if (leftRunId) params.set("left", leftRunId);
    if (rightRunId) params.set("right", rightRunId);
    if (sourcePath) params.set("source", sourcePath);
    router.push(`/compare/${encodeURIComponent(task)}/${encodeURIComponent(episodeDir)}?${params.toString()}`);
  }

  // Fetch trajectories for both sides
  const { trajectory: leftTraj } = useTrajectory(
    task,
    leftRunId,
    ep,
    sourcePath,
  );
  const { trajectory: rightTraj } = useTrajectory(
    task,
    rightRunId,
    ep,
    sourcePath,
  );

  // Fetch episode meta (for scene ID — same for both since same episode)
  const episodeMeta = useEpisodeMeta(
    task,
    leftRunId ?? rightRunId,
    ep,
    sourcePath,
  );
  const sceneId = episodeMeta?.meta?.scene
    ? String(episodeMeta.meta.scene)
    : null;

  // Fetch episode instruction (same episode, use whichever run is available)
  const [instruction, setInstruction] = useState<string | null>(null);

  useEffect(() => {
    const runId = leftRunId ?? rightRunId;
    if (!runId) return;
    fetch(`/api/episodes?task=${encodeURIComponent(task)}&run=${encodeURIComponent(runId)}${sourceQuery}`)
      .then(r => r.json())
      .then((eps: Array<{ episodeDir: string; result: { instruction?: string } | null }>) => {
        const found = eps.find(e => e.episodeDir === ep);
        if (found?.result?.instruction) setInstruction(found.result.instruction as string);
      })
      .catch(console.error);
  }, [task, leftRunId, rightRunId, ep, sourceQuery]);

  // Fetch configs for both runs
  const [leftConfig, setLeftConfig] = useState<RunConfig | null>(null);
  const [rightConfig, setRightConfig] = useState<RunConfig | null>(null);

  useEffect(() => {
    if (!leftRunId) return;
    fetch(
      `/api/run?task=${encodeURIComponent(task)}&run=${encodeURIComponent(leftRunId)}${sourceQuery}`,
    )
      .then((r) => r.json())
      .then((d) => setLeftConfig(d.config ?? null))
      .catch(console.error);
  }, [task, leftRunId, sourceQuery]);

  useEffect(() => {
    if (!rightRunId) return;
    fetch(
      `/api/run?task=${encodeURIComponent(task)}&run=${encodeURIComponent(rightRunId)}${sourceQuery}`,
    )
      .then((r) => r.json())
      .then((d) => setRightConfig(d.config ?? null))
      .catch(console.error);
  }, [task, rightRunId, sourceQuery]);

  // Shared playback state
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const maxStep = Math.max(
    leftTraj.length > 0 ? leftTraj.length - 1 : 0,
    rightTraj.length > 0 ? rightTraj.length - 1 : 0,
  );

  const handleStepChange = useCallback(
    (s: number) => {
      setCurrentStep(Math.max(0, Math.min(s, maxStep)));
    },
    [maxStep],
  );

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
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

  // Helper to update URL when run selection changes
  function updateRun(side: "left" | "right", runId: string) {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set(side, runId);
    router.push(
      `/compare/${encodeURIComponent(task)}/${encodeURIComponent(ep)}?${newParams.toString()}`,
    );
  }

  const leftStep = leftTraj[currentStep] ?? null;
  const rightStep = rightTraj[currentStep] ?? null;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/"
          className="hover:text-foreground flex items-center gap-1"
        >
          <Home className="size-3.5" /> Home
        </Link>
        <ChevronRight className="size-3.5" />
        <Link
          href={`/task/${encodeURIComponent(task)}${sourcePath ? `?source=${encodeURIComponent(sourcePath)}` : ""}`}
          className="hover:text-foreground"
        >
          {task}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground font-mono">Compare: {ep}</span>
      </div>

      {/* Episode navigation */}
      {allEpisodes.length > 1 && (
        <div className="flex items-center gap-2">
          <button
            disabled={!prevEp}
            onClick={() => prevEp && navigateToEpisode(prevEp.episodeDir)}
            className="px-1.5 py-1 border border-border rounded-sm hover:bg-[#252535] transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground"
          >
            <ArrowLeft className="size-3.5" />
          </button>
          <select
            value={ep}
            onChange={(e) => navigateToEpisode(e.target.value)}
            className="bg-card border border-border rounded-sm px-3 py-1.5 text-xs font-mono text-foreground"
          >
            {allEpisodes.map((e) => (
              <option key={e.episodeDir} value={e.episodeDir}>{e.episodeId}</option>
            ))}
          </select>
          <button
            disabled={!nextEp}
            onClick={() => nextEp && navigateToEpisode(nextEp.episodeDir)}
            className="px-1.5 py-1 border border-border rounded-sm hover:bg-[#252535] transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground"
          >
            <ArrowRight2 className="size-3.5" />
          </button>
          <span className="text-[10px] text-muted-foreground font-mono">{currentEpIdx + 1} / {allEpisodes.length}</span>
        </div>
      )}

      {/* Episode info */}
      {instruction && (
        <div className="border border-border rounded-sm p-4 space-y-2">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">Episode</div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-primary">{ep}</span>
            {sceneId && <span className="text-[10px] text-muted-foreground font-mono bg-[#1C1C28] px-1.5 py-0.5 rounded-sm">{sceneId}</span>}
          </div>
          <p className="text-sm leading-relaxed font-sans">{instruction}</p>
        </div>
      )}

      {/* Run selectors */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left run selector */}
        <div>
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-1.5">
            Left
          </div>
          <select
            value={leftRunId ?? ""}
            onChange={(e) => updateRun("left", e.target.value)}
            className="w-full bg-card border border-border rounded-sm px-3 py-1.5 text-xs font-mono text-foreground"
          >
            <option value="">Select run...</option>
            {runs.map((r) => (
              <option key={r.runId} value={r.runId}>
                {formatRunLabel(r.runId, r.model)}
              </option>
            ))}
          </select>
        </div>
        {/* Right run selector */}
        <div>
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-1.5">
            Right
          </div>
          <select
            value={rightRunId ?? ""}
            onChange={(e) => updateRun("right", e.target.value)}
            className="w-full bg-card border border-border rounded-sm px-3 py-1.5 text-xs font-mono text-foreground"
          >
            <option value="">Select run...</option>
            {runs.map((r) => (
              <option key={r.runId} value={r.runId}>
                {formatRunLabel(r.runId, r.model)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Viewers row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left viewer */}
        <div>
          {leftRunId && leftTraj.length > 0 && (
            <div
              className={`grid gap-3 ${sceneId ? "grid-cols-2" : "grid-cols-1"}`}
            >
              <FrameViewer
                task={task}
                run={leftRunId}
                ep={ep}
                trajectory={leftTraj}
                camera="front"
                currentStep={Math.min(currentStep, leftTraj.length - 1)}
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
                  trajectory={leftTraj}
                  currentStep={Math.min(currentStep, leftTraj.length - 1)}
                  onStepClick={handleStepChange}
                  task={task}
                />
              )}
            </div>
          )}
          {leftRunId && leftTraj.length === 0 && (
            <div className="aspect-square bg-card border border-border rounded-sm flex items-center justify-center text-muted-foreground text-sm">
              No trajectory data
            </div>
          )}
          {!leftRunId && (
            <div className="aspect-square bg-card border border-border rounded-sm flex items-center justify-center text-muted-foreground text-sm">
              Select a run
            </div>
          )}
        </div>

        {/* Right viewer */}
        <div>
          {rightRunId && rightTraj.length > 0 && (
            <div
              className={`grid gap-3 ${sceneId ? "grid-cols-2" : "grid-cols-1"}`}
            >
              <FrameViewer
                task={task}
                run={rightRunId}
                ep={ep}
                trajectory={rightTraj}
                camera="front"
                currentStep={Math.min(currentStep, rightTraj.length - 1)}
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
                  trajectory={rightTraj}
                  currentStep={Math.min(currentStep, rightTraj.length - 1)}
                  onStepClick={handleStepChange}
                  task={task}
                />
              )}
            </div>
          )}
          {rightRunId && rightTraj.length === 0 && (
            <div className="aspect-square bg-card border border-border rounded-sm flex items-center justify-center text-muted-foreground text-sm">
              No trajectory data
            </div>
          )}
          {!rightRunId && (
            <div className="aspect-square bg-card border border-border rounded-sm flex items-center justify-center text-muted-foreground text-sm">
              Select a run
            </div>
          )}
        </div>
      </div>

      {/* Timeline markers for both runs */}
      {leftTraj.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground w-10 shrink-0">Left</span>
          <div className="flex-1">
            <TimelineMarkers trajectory={leftTraj} onStepClick={handleStepChange} />
          </div>
        </div>
      )}
      {rightTraj.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground w-10 shrink-0">Right</span>
          <div className="flex-1">
            <TimelineMarkers trajectory={rightTraj} onStepClick={handleStepChange} />
          </div>
        </div>
      )}
      <PlaybackControls
        currentStep={currentStep}
        maxStep={maxStep}
        playing={playing}
        speed={speed}
        onStepChange={handleStepChange}
        onPlayPause={() => setPlaying(!playing)}
        onSpeedChange={setSpeed}
      />
      <div className="text-[10px] text-muted-foreground/50 font-mono">
        &larr; &rarr; step &middot; space play/pause
        {leftTraj.length !== rightTraj.length && (
          <span className="ml-4">
            Left: {leftTraj.length} steps &middot; Right: {rightTraj.length}{" "}
            steps
          </span>
        )}
      </div>

      {/* Metadata panels */}
      <div className="grid grid-cols-2 gap-4">
        <MetadataPanel
          step={leftStep}
          totalSteps={leftTraj.length}
          config={leftConfig}
          trajectory={leftTraj}
          currentStepIndex={Math.min(currentStep, leftTraj.length - 1)}
        />
        <MetadataPanel
          step={rightStep}
          totalSteps={rightTraj.length}
          config={rightConfig}
          trajectory={rightTraj}
          currentStepIndex={Math.min(currentStep, rightTraj.length - 1)}
        />
      </div>
    </div>
  );
}
