import type { EpisodeInfo, EpisodeResult } from "@/types/easi";

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  // dateStr format: "YYYY-MM-DD HH:MM" (local time from log folder name)
  const parsed = Date.parse(dateStr.replace(" ", "T"));
  if (isNaN(parsed)) return dateStr;
  const diffMs = now - parsed;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth}mo ago`;
}

export function getEpisodeStatus(ep: EpisodeInfo): "success" | "fail" | "early_stop" | "unknown" {
  if (!ep.result) return "unknown";
  if (ep.result.forced_early_stop) return "early_stop";
  const success = (ep.result.task_success ?? ep.result.success) as number | undefined;
  if (typeof success === "number" && success > 0) return "success";
  return "fail";
}

/**
 * Format a run for display in breadcrumbs/UI.
 * Shows: "YYYY-MM-DD HH:MM · last/3/segments" from the model path.
 * Falls back to runId if model path not available.
 */
export function formatRunLabel(runId: string, modelPath?: string | null): string {
  // Extract datetime from runId (format: 20260416_152043_...)
  const dateMatch = runId.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/);
  const datePart = dateMatch
    ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]} ${dateMatch[4]}:${dateMatch[5]}`
    : "";

  if (modelPath) {
    // Take last 3 path segments: e.g., "InternVL/260414_LHVLN_DFS/checkpoint-5000"
    const segments = modelPath.replace(/\/$/, "").split("/");
    const tail = segments.slice(-3).join("/");
    return datePart ? `${datePart} · ${tail}` : tail;
  }

  return runId;
}

/** Return type for subtask helpers */
export interface SubtaskInfo {
  completed: number;
  total: number;
  tint: "full" | "partial" | "zero" | "none";
}

/**
 * Tailwind text-color class for each tint.
 * All three UI surfaces must import and use this map — no inline tint logic in components.
 */
export const SUBTASK_TINT_CLASS: Record<"full" | "partial" | "zero" | "none", string> = {
  full: "text-success",
  partial: "text-warning",
  zero: "text-destructive",
  none: "text-muted-foreground",
};

/**
 * Canonical subtask helper — accepts EpisodeResult directly.
 * Used by EpisodeHeader (which only has EpisodeResult | null, not EpisodeInfo).
 *
 * Returns null when:
 *   - result is null / undefined
 *   - either num_subtasks or subtasks_completed is absent
 *   - either field is not a finite number
 *
 * Tint classification order (total === 0 must be checked FIRST so 0/0 → "none", not "full"):
 *   total === 0                    → "none"
 *   completed === total (total > 0) → "full"
 *   completed === 0  (total > 0)   → "zero"
 *   otherwise                      → "partial"
 */
export function getSubtaskInfoFromResult(result: EpisodeResult | null | undefined): SubtaskInfo | null {
  if (!result) return null;
  const total = result.num_subtasks;
  const completed = result.subtasks_completed;
  if (total === undefined || completed === undefined) return null;
  if (typeof total !== "number" || !isFinite(total)) return null;
  if (typeof completed !== "number" || !isFinite(completed)) return null;

  let tint: "full" | "partial" | "zero" | "none";
  if (total === 0) {
    tint = "none";
  } else if (completed === total) {
    tint = "full";
  } else if (completed === 0) {
    tint = "zero";
  } else {
    tint = "partial";
  }

  return { completed, total, tint };
}

/**
 * Thin wrapper for components that receive EpisodeInfo objects (EpisodeList, EpisodeCards).
 */
export function getSubtaskInfo(ep: EpisodeInfo): SubtaskInfo | null {
  return getSubtaskInfoFromResult(ep.result);
}

/**
 * Returns true when at least one episode in the array has subtask data.
 * Used by EpisodeList to decide whether to render the SUBTASKS column at all.
 */
export function anyEpisodeHasSubtasks(eps: EpisodeInfo[]): boolean {
  return eps.some((ep) => getSubtaskInfo(ep) !== null);
}
