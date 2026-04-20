"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, ChevronRight, ChevronLeft as ArrowLeft, ChevronRight as ArrowRight2 } from "lucide-react";
import {
  useRuns, useTrajectory, useEpisodeMeta, useEpisodes, useTasks,
} from "@/lib/hooks";
import { FrameViewer } from "@/components/trajectory/frame-viewer";
import { MapOverlay } from "@/components/trajectory/map-overlay";
import { TimelineMarkers } from "@/components/trajectory/timeline-markers";
import { PlaybackControls } from "@/components/trajectory/playback-controls";
import { MetadataPanel } from "@/components/trajectory/metadata-panel";
import { formatRunLabel } from "@/lib/episode-utils";
import type { RunConfig, RunInfo, TaskInfo } from "@/types/easi";

/** Dual task+run selector shared by left/right. */
function SideSelector({
  label, task, run, tasks, runs, onTaskChange, onRunChange,
}: {
  label: string;
  task: string;
  run: string | null;
  tasks: TaskInfo[];
  runs: RunInfo[];
  onTaskChange: (next: string) => void;
  onRunChange: (next: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
        {label}
      </div>
      <select
        value={task}
        onChange={(e) => onTaskChange(e.target.value)}
        className="w-full bg-card border border-border rounded-sm px-3 py-1.5 text-xs font-mono text-foreground"
      >
        {tasks.length === 0 && <option value={task}>{task}</option>}
        {tasks.map((t) => (
          <option key={`${t.sourcePath}:${t.name}`} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>
      <select
        value={run ?? ""}
        onChange={(e) => onRunChange(e.target.value)}
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
  );
}

export default function ComparePage() {
  const params = useParams<{ task: string; ep: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathTask = decodeURIComponent(params.task);
  const ep = decodeURIComponent(params.ep);
  const sourcePath = searchParams.get("source");

  // Per-side task + run. Fall back to path task when query param absent.
  const leftTask = searchParams.get("leftTask") ?? pathTask;
  const rightTask = searchParams.get("rightTask") ?? pathTask;
  const leftRunId = searchParams.get("left");
  const rightRunId = searchParams.get("right");
  const isCrossTask = leftTask !== rightTask;

  const sourceQuery = sourcePath
    ? `&source=${encodeURIComponent(sourcePath)}`
    : "";

  // Tasks for dropdowns — filter to same source if set.
  const { tasks: allTasks } = useTasks();
  const tasksForSource = useMemo(() => {
    if (!sourcePath) return allTasks;
    return allTasks.filter((t) => t.sourcePath === sourcePath);
  }, [allTasks, sourcePath]);

  // Runs per side.
  const { runs: leftRuns } = useRuns(leftTask, sourcePath);
  const { runs: rightRuns } = useRuns(rightTask, sourcePath);

  // Trajectories per side.
  const { trajectory: leftTraj } = useTrajectory(leftTask, leftRunId, ep, sourcePath);
  const { trajectory: rightTraj } = useTrajectory(rightTask, rightRunId, ep, sourcePath);

  // Episode lists per side — intersection drives navigation.
  const { episodes: leftEps } = useEpisodes(leftTask, leftRunId, sourcePath);
  const { episodes: rightEps } = useEpisodes(rightTask, rightRunId, sourcePath);
  const navEpisodes = useMemo(() => {
    const source = leftEps.length > 0 ? leftEps : rightEps;
    const other = leftEps.length > 0 ? rightEps : leftEps;
    if (other.length === 0) return source;
    const otherSet = new Set(other.map((e) => e.episodeDir));
    return source.filter((e) => otherSet.has(e.episodeDir));
  }, [leftEps, rightEps]);

  const currentEpIdx = navEpisodes.findIndex((e) => e.episodeDir === ep);
  const prevEp = currentEpIdx > 0 ? navEpisodes[currentEpIdx - 1] : null;
  const nextEp = currentEpIdx >= 0 && currentEpIdx < navEpisodes.length - 1
    ? navEpisodes[currentEpIdx + 1] : null;
  const epMissingOnLeft = leftRunId !== null && leftEps.length > 0 && !leftEps.some((e) => e.episodeDir === ep);
  const epMissingOnRight = rightRunId !== null && rightEps.length > 0 && !rightEps.some((e) => e.episodeDir === ep);

  function buildComparePath(nextEp: string): string {
    const next = new URLSearchParams(searchParams.toString());
    // The path task stays whichever side matches it, so links remain canonical.
    return `/compare/${encodeURIComponent(pathTask)}/${encodeURIComponent(nextEp)}?${next.toString()}`;
  }

  function navigateToEpisode(episodeDir: string) {
    router.push(buildComparePath(episodeDir));
  }

  // Episode meta: scene id from either side (same episode => same scene).
  const leftMeta = useEpisodeMeta(leftTask, leftRunId, ep, sourcePath);
  const rightMeta = useEpisodeMeta(rightTask, rightRunId, ep, sourcePath);
  const sceneId =
    (leftMeta?.meta?.scene ? String(leftMeta.meta.scene) : null) ??
    (rightMeta?.meta?.scene ? String(rightMeta.meta.scene) : null);

  // Instruction lookup — prefer left, fall back to right.
  const [instruction, setInstruction] = useState<string | null>(null);
  useEffect(() => {
    setInstruction(null);
    const attempts: Array<{ task: string; run: string }> = [];
    if (leftRunId) attempts.push({ task: leftTask, run: leftRunId });
    if (rightRunId) attempts.push({ task: rightTask, run: rightRunId });
    let cancelled = false;
    (async () => {
      for (const a of attempts) {
        try {
          const res = await fetch(
            `/api/episodes?task=${encodeURIComponent(a.task)}&run=${encodeURIComponent(a.run)}${sourceQuery}`,
          );
          if (!res.ok) continue;
          const eps: Array<{ episodeDir: string; result: { instruction?: string } | null }> =
            await res.json();
          const found = eps.find((e) => e.episodeDir === ep);
          if (!cancelled && found?.result?.instruction) {
            setInstruction(found.result.instruction);
            return;
          }
        } catch {
          // try next
        }
      }
    })();
    return () => { cancelled = true; };
  }, [leftTask, leftRunId, rightTask, rightRunId, ep, sourceQuery]);

  // Per-side run configs.
  const [leftConfig, setLeftConfig] = useState<RunConfig | null>(null);
  const [rightConfig, setRightConfig] = useState<RunConfig | null>(null);

  useEffect(() => {
    setLeftConfig(null);
    if (!leftRunId) return;
    fetch(`/api/run?task=${encodeURIComponent(leftTask)}&run=${encodeURIComponent(leftRunId)}${sourceQuery}`)
      .then((r) => r.json())
      .then((d) => setLeftConfig(d.config ?? null))
      .catch(console.error);
  }, [leftTask, leftRunId, sourceQuery]);

  useEffect(() => {
    setRightConfig(null);
    if (!rightRunId) return;
    fetch(`/api/run?task=${encodeURIComponent(rightTask)}&run=${encodeURIComponent(rightRunId)}${sourceQuery}`)
      .then((r) => r.json())
      .then((d) => setRightConfig(d.config ?? null))
      .catch(console.error);
  }, [rightTask, rightRunId, sourceQuery]);

  // Shared playback state.
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const maxStep = Math.max(
    leftTraj.length > 0 ? leftTraj.length - 1 : 0,
    rightTraj.length > 0 ? rightTraj.length - 1 : 0,
  );

  const handleStepChange = useCallback(
    (s: number) => { setCurrentStep(Math.max(0, Math.min(s, maxStep))); },
    [maxStep],
  );

  // Keyboard shortcuts.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case "ArrowLeft": e.preventDefault(); handleStepChange(currentStep - 1); break;
        case "ArrowRight": e.preventDefault(); handleStepChange(currentStep + 1); break;
        case " ": e.preventDefault(); setPlaying((p) => !p); break;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, handleStepChange]);

  // URL mutators.
  function updateQuery(mutate: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    router.push(
      `/compare/${encodeURIComponent(pathTask)}/${encodeURIComponent(ep)}?${next.toString()}`,
    );
  }

  function updateRun(side: "left" | "right", runId: string) {
    updateQuery((p) => {
      if (runId) p.set(side, runId); else p.delete(side);
    });
  }

  function updateTask(side: "left" | "right", nextTask: string) {
    updateQuery((p) => {
      if (nextTask === pathTask) p.delete(`${side}Task`);
      else p.set(`${side}Task`, nextTask);
      // Clear the run selection for this side — run ids don't carry across tasks.
      p.delete(side);
    });
  }

  const leftStep = leftTraj[currentStep] ?? null;
  const rightStep = rightTraj[currentStep] ?? null;
  const leftTaskDisplay = leftTask;
  const rightTaskDisplay = rightTask;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground flex items-center gap-1">
          <Home className="size-3.5" /> Home
        </Link>
        <ChevronRight className="size-3.5" />
        <Link
          href={`/task/${encodeURIComponent(pathTask)}${sourcePath ? `?source=${encodeURIComponent(sourcePath)}` : ""}`}
          className="hover:text-foreground"
        >
          {pathTask}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground font-mono">Compare: {ep}</span>
        {isCrossTask && (
          <span className="ml-2 px-1.5 py-0.5 rounded-sm bg-warning text-background text-[9px] font-bold uppercase tracking-wide">
            Cross-task
          </span>
        )}
      </div>

      {/* Episode navigation */}
      {navEpisodes.length > 1 && (
        <div className="flex items-center gap-2">
          <button
            disabled={!prevEp}
            onClick={() => prevEp && navigateToEpisode(prevEp.episodeDir)}
            className="px-1.5 py-1 border border-border rounded-sm hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground"
          >
            <ArrowLeft className="size-3.5" />
          </button>
          <select
            value={ep}
            onChange={(e) => navigateToEpisode(e.target.value)}
            className="bg-card border border-border rounded-sm px-3 py-1.5 text-xs font-mono text-foreground"
          >
            {currentEpIdx < 0 && <option value={ep}>{ep}</option>}
            {navEpisodes.map((e) => (
              <option key={e.episodeDir} value={e.episodeDir}>{e.episodeId}</option>
            ))}
          </select>
          <button
            disabled={!nextEp}
            onClick={() => nextEp && navigateToEpisode(nextEp.episodeDir)}
            className="px-1.5 py-1 border border-border rounded-sm hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground"
          >
            <ArrowRight2 className="size-3.5" />
          </button>
          <span className="text-[10px] text-muted-foreground font-mono">
            {currentEpIdx >= 0 ? currentEpIdx + 1 : "?"} / {navEpisodes.length}
          </span>
        </div>
      )}

      {/* Episode info */}
      {instruction && (
        <div className="border border-border rounded-sm p-4 space-y-2">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">Episode</div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-primary">{ep}</span>
            {sceneId && (
              <span className="text-[10px] text-muted-foreground font-mono bg-popover px-1.5 py-0.5 rounded-sm">
                {sceneId}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed font-sans">{instruction}</p>
        </div>
      )}

      {/* Side selectors */}
      <div className="grid grid-cols-2 gap-4">
        <SideSelector
          label="Left"
          task={leftTask}
          run={leftRunId}
          tasks={tasksForSource}
          runs={leftRuns}
          onTaskChange={(t) => updateTask("left", t)}
          onRunChange={(r) => updateRun("left", r)}
        />
        <SideSelector
          label="Right"
          task={rightTask}
          run={rightRunId}
          tasks={tasksForSource}
          runs={rightRuns}
          onTaskChange={(t) => updateTask("right", t)}
          onRunChange={(r) => updateRun("right", r)}
        />
      </div>

      {/* Episode-missing warnings */}
      {(epMissingOnLeft || epMissingOnRight) && (
        <div className="border border-warning/40 bg-warning/10 text-warning text-xs font-mono rounded-sm px-3 py-2">
          Episode <span className="font-bold">{ep}</span> is missing on{" "}
          {epMissingOnLeft && epMissingOnRight ? "both sides" : epMissingOnLeft ? "the left run" : "the right run"}.
          Pick another episode from the dropdown.
        </div>
      )}

      {/* Viewers row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left viewer */}
        <div>
          {leftRunId && leftTraj.length > 0 && (
            <div className={`grid gap-3 ${sceneId ? "grid-cols-2" : "grid-cols-1"}`}>
              <FrameViewer
                task={leftTask}
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
                  task={leftTask}
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
            <div className={`grid gap-3 ${sceneId ? "grid-cols-2" : "grid-cols-1"}`}>
              <FrameViewer
                task={rightTask}
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
                  task={rightTask}
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
            Left: {leftTraj.length} steps &middot; Right: {rightTraj.length} steps
          </span>
        )}
      </div>

      {/* Metadata panels with per-side task labels */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            Left &middot; <span className="text-foreground">{leftTaskDisplay}</span>
          </div>
          <MetadataPanel
            step={leftStep}
            totalSteps={leftTraj.length}
            config={leftConfig}
            trajectory={leftTraj}
            currentStepIndex={Math.min(currentStep, leftTraj.length - 1)}
          />
        </div>
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            Right &middot; <span className="text-foreground">{rightTaskDisplay}</span>
          </div>
          <MetadataPanel
            step={rightStep}
            totalSteps={rightTraj.length}
            config={rightConfig}
            trajectory={rightTraj}
            currentStepIndex={Math.min(currentStep, rightTraj.length - 1)}
          />
        </div>
      </div>
    </div>
  );
}
