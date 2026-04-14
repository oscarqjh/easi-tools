import type { EpisodeInfo } from "@/types/easi";

export function getEpisodeStatus(ep: EpisodeInfo): "success" | "fail" | "early_stop" | "unknown" {
  if (!ep.result) return "unknown";
  if (ep.result.forced_early_stop) return "early_stop";
  const success = (ep.result.task_success ?? ep.result.success) as number | undefined;
  if (typeof success === "number" && success > 0) return "success";
  return "fail";
}
