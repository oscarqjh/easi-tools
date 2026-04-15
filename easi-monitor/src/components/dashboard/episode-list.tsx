"use client";

import Link from "next/link";
import type { EpisodeInfo } from "@/types/easi";
import { getEpisodeStatus } from "@/lib/episode-utils";

interface Props {
  episodes: EpisodeInfo[];
  task: string;
  run: string;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string }> = {
    success: { label: "SUCCESS", bg: "bg-[#34D399]" },
    fail: { label: "FAILED", bg: "bg-[#F87171]" },
    early_stop: { label: "EARLY STOP", bg: "bg-[#FBBF24]" },
    unknown: { label: "UNKNOWN", bg: "bg-[#64748B]" },
  };
  const cfg = config[status] ?? config.unknown;
  return (
    <span className={`${cfg.bg} text-[#0A0A0F] text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm`}>
      {cfg.label}
    </span>
  );
}

export function EpisodeList({ episodes, task, run }: Props) {
  return (
    <div className="border rounded-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-[#1C1C28]">
            <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Status</th>
            <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Episode</th>
            <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Instruction</th>
            <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Steps</th>
            <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Time</th>
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
                  className={`border-b border-border hover:bg-[#252535] transition-colors ${idx % 2 === 1 ? "bg-card" : "bg-transparent"}`}
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
                  <td className="px-4 py-2 max-w-[400px] text-muted-foreground font-sans">
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
