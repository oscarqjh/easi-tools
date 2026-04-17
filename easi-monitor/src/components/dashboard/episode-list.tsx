"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Columns2 } from "lucide-react";
import type { EpisodeInfo } from "@/types/easi";
import { getEpisodeStatus } from "@/lib/episode-utils";

interface Props {
  episodes: EpisodeInfo[];
  task: string;
  run: string;
  sourcePath: string | null;
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

export function EpisodeList({ episodes, task, run, sourcePath }: Props) {
  const router = useRouter();
  const sourceQuery = sourcePath ? `?source=${encodeURIComponent(sourcePath)}` : "";

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
            <th className="px-2 py-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {episodes.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
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
                  className={`border-b border-border hover:bg-[#252535] transition-colors cursor-pointer ${idx % 2 === 1 ? "bg-card" : "bg-transparent"}`}
                  onClick={() => router.push(`/episode/${encodeURIComponent(task)}/${encodeURIComponent(run)}/${encodeURIComponent(ep.episodeDir)}${sourceQuery}`)}
                >
                  <td className="px-4 py-2"><StatusBadge status={status} /></td>
                  <td className="px-4 py-2 font-mono text-primary">{ep.episodeId}</td>
                  <td className="px-4 py-2 max-w-[400px] text-muted-foreground font-sans">
                    <span className="block truncate">{instruction}</span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {typeof steps === "number" ? Math.round(steps) : "\u2014"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {typeof time === "number" ? `${Math.round(time)}s` : "\u2014"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <Link
                      href={`/compare/${encodeURIComponent(task)}/${encodeURIComponent(ep.episodeDir)}?left=${encodeURIComponent(run)}${sourcePath ? `&source=${encodeURIComponent(sourcePath)}` : ""}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center size-6 rounded-sm text-muted-foreground hover:text-foreground hover:bg-[#252535] transition-colors"
                      title="Compare this episode across runs"
                    >
                      <Columns2 className="size-3.5" />
                    </Link>
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
