import type { EpisodeInfo } from "@/types/easi";

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
