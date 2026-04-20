"use client";

import Link from "next/link";
import type { EpisodeInfo } from "@/types/easi";
import { getEpisodeStatus } from "@/lib/episode-utils";

interface Props {
  episodes: EpisodeInfo[];
  task: string;
  run: string;
  sourcePath: string | null;
}

const statusConfig: Record<string, { label: string; badgeBg: string; borderColor: string }> = {
  success: { label: "SUCCESS", badgeBg: "bg-success", borderColor: "border-l-success" },
  fail: { label: "FAILED", badgeBg: "bg-destructive", borderColor: "border-l-destructive" },
  early_stop: { label: "EARLY STOP", badgeBg: "bg-warning", borderColor: "border-l-warning" },
  unknown: { label: "UNKNOWN", badgeBg: "bg-muted-foreground", borderColor: "border-l-muted-foreground" },
};

export function EpisodeCards({ episodes, task, run, sourcePath }: Props) {
  const sourceQuery = sourcePath ? `?source=${encodeURIComponent(sourcePath)}` : "";
  const sourceParam = sourcePath ? `&source=${encodeURIComponent(sourcePath)}` : "";

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {episodes.map((ep) => {
        const status = getEpisodeStatus(ep);
        const steps = ep.result?.num_steps as number | undefined;
        const cfg = statusConfig[status] ?? statusConfig.unknown;
        return (
          <Link
            key={ep.episodeDir}
            href={`/episode/${encodeURIComponent(task)}/${encodeURIComponent(run)}/${encodeURIComponent(ep.episodeDir)}${sourceQuery}`}
          >
            <div className={`cursor-pointer bg-card border border-border border-l-2 ${cfg.borderColor} rounded-sm hover:bg-accent transition-colors`}>
              <div className="p-4">
                <div className="relative aspect-video bg-card rounded-sm mb-2 overflow-hidden">
                  {ep.hasImages ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={`/api/frame?task=${encodeURIComponent(task)}&run=${encodeURIComponent(run)}&ep=${encodeURIComponent(ep.episodeDir)}&step=0&camera=front${sourceParam}`}
                      alt={ep.episodeId}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xs text-muted-foreground font-mono">[NO IMAGE]</span>
                    </div>
                  )}
                  <div className="absolute top-1.5 right-1.5">
                    <span className={`${cfg.badgeBg} text-background text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-sm`}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
                <div className="font-mono text-sm">{ep.episodeId}</div>
                <div className="text-xs text-muted-foreground mt-1 font-sans">
                  {typeof steps === "number" ? `${Math.round(steps)} steps` : ""}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
