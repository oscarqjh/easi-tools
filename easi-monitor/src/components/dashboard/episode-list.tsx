"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { EpisodeInfo } from "@/types/easi";
import { getEpisodeStatus } from "@/lib/episode-utils";

interface Props {
  episodes: EpisodeInfo[];
  task: string;
  run: string;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
    success: "default", fail: "destructive", early_stop: "secondary", unknown: "outline",
  };
  const labels: Record<string, string> = {
    success: "Success", fail: "Failed", early_stop: "Early Stop", unknown: "?",
  };
  return <Badge variant={variants[status] ?? "outline"}>{labels[status] ?? status}</Badge>;
}

export function EpisodeList({ episodes, task, run }: Props) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted">
            <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
            <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Episode</th>
            <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Instruction</th>
            <th className="px-4 py-2.5 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">Steps</th>
            <th className="px-4 py-2.5 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">Time</th>
          </tr>
        </thead>
        <tbody>
          {episodes.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                No episodes match the current filters.
              </td>
            </tr>
          ) : (
            episodes.map((ep, idx) => {
              const status = getEpisodeStatus(ep);
              const instruction = ep.result?.instruction ?? "";
              const steps = ep.result?.num_steps as number | undefined;
              const time = ep.result?.elapsed_seconds;
              return (
                <tr
                  key={ep.episodeDir}
                  className={`border-b hover:bg-muted/50 transition-colors ${idx % 2 === 1 ? "bg-muted/20" : ""}`}
                >
                  <td className="px-4 py-2"><StatusBadge status={status} /></td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/episode/${encodeURIComponent(task)}/${encodeURIComponent(run)}/${encodeURIComponent(ep.episodeDir)}`}
                      className="font-mono text-primary hover:underline"
                    >
                      {ep.episodeId}
                    </Link>
                  </td>
                  <td className="px-4 py-2 max-w-[400px] text-muted-foreground">
                    <span className="block truncate">{instruction}</span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {typeof steps === "number" ? Math.round(steps) : "\u2014"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {typeof time === "number" ? `${Math.round(time)}s` : "\u2014"}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
