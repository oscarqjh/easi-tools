"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { EpisodeInfo } from "@/types/easi";
import { getEpisodeStatus } from "@/lib/episode-utils";

interface Props {
  episodes: EpisodeInfo[];
  task: string;
  run: string;
}

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
        return (
          <Link
            key={ep.episodeDir}
            href={`/episode/${encodeURIComponent(task)}/${encodeURIComponent(run)}/${encodeURIComponent(ep.episodeDir)}`}
          >
            <Card className={`hover:bg-muted/30 cursor-pointer border-l-4 ${borderColor}`}>
              <CardContent className="p-4">
                {ep.hasImages && (
                  <div className="aspect-video bg-muted rounded mb-2 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/frame?task=${encodeURIComponent(task)}&run=${encodeURIComponent(run)}&ep=${encodeURIComponent(ep.episodeDir)}&step=0&camera=front`}
                      alt={ep.episodeId}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
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
