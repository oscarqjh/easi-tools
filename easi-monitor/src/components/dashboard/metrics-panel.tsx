"use client";

import type { RunSummary } from "@/types/easi";

interface Props {
  summary: RunSummary | null;
}

interface MetricCard {
  label: string;
  value: string;
  accentColor: string;
}

export function MetricsPanel({ summary }: Props) {
  if (!summary) {
    return (
      <div className="bg-card border border-border rounded-sm p-4 text-muted-foreground font-sans">
        No summary available (run may be in progress)
      </div>
    );
  }

  const cards: MetricCard[] = [
    {
      label: "Episodes",
      value: String(summary.num_episodes),
      accentColor: "border-l-[#00D4AA]",
    },
  ];

  if (typeof summary.success_rate === "number") {
    cards.push({
      label: "Success Rate",
      value: `${(summary.success_rate * 100).toFixed(1)}%`,
      accentColor: "border-l-[#34D399]",
    });
  }
  if (typeof summary.avg_steps === "number") {
    cards.push({
      label: "Avg Steps",
      value: String(Math.round(summary.avg_steps)),
      accentColor: "border-l-[#60A5FA]",
    });
  }
  if (typeof summary.median_steps === "number") {
    cards.push({
      label: "Median Steps",
      value: String(Math.round(summary.median_steps)),
      accentColor: "border-l-[#A78BFA]",
    });
  }
  if (typeof summary.wall_clock_seconds === "number") {
    cards.push({
      label: "Wall Clock",
      value: `${Math.round(summary.wall_clock_seconds / 60)}m`,
      accentColor: "border-l-[#FBBF24]",
    });
  }
  if (summary.llm_usage?.total_tokens) {
    cards.push({
      label: "Total Tokens",
      value: summary.llm_usage.total_tokens.toLocaleString(),
      accentColor: "border-l-[#F87171]",
    });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((c) => (
        <div key={c.label} className={`bg-card border border-border border-l-2 ${c.accentColor} rounded-sm p-3`}>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans mb-2">
            {c.label}
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
