"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageIcon } from "lucide-react";
import type { EpisodeInfo } from "@/types/easi";
import { getEpisodeStatus } from "@/lib/episode-utils";

interface Props {
  episodes: EpisodeInfo[];
  task: string;
  run: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  success: { label: "Success", variant: "default" },
  fail: { label: "Failed", variant: "destructive" },
  early_stop: { label: "Early Stop", variant: "secondary" },
  unknown: { label: "?", variant: "outline" },
};

export function EpisodeCards({ episodes, task, run }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {episodes.map((ep) => {
        const status = getEpisodeStatus(ep);
        const steps = ep.result?.num_steps as number | undefined;
        const borderColor =
          status === "success" ? "border-green-500" :
          status === "fail" ? "border-red-500" :
          status === "early_stop" ? "border-yellow-500" : "";
        const cfg = statusConfig[status] ?? statusConfig.unknown;
        return (
          <Link
            key={ep.episodeDir}
            href={`/episode/${encodeURIComponent(task)}/${encodeURIComponent(run)}/${encodeURIComponent(ep.episodeDir)}`}
          >
            <Card className={`cursor-pointer border-l-4 ${borderColor} hover:scale-[1.02] hover:shadow-md transition-all duration-200`}>
              <CardContent className="p-4">
                <div className="relative aspect-video bg-muted rounded mb-2 overflow-hidden">
                  {ep.hasImages ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={`/api/frame?task=${encodeURIComponent(task)}&run=${encodeURIComponent(run)}&ep=${encodeURIComponent(ep.episodeDir)}&step=0&camera=front`}
                      alt={ep.episodeId}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="size-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute top-1.5 right-1.5">
                    <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0">
                      {cfg.label}
                    </Badge>
                  </div>
                </div>
                <div className="font-mono text-sm">{ep.episodeId}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {typeof steps === "number" ? `${Math.round(steps)} steps` : ""}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
