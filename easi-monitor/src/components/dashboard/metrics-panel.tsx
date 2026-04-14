"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RunSummary } from "@/types/easi";

interface Props {
  summary: RunSummary | null;
}

export function MetricsPanel({ summary }: Props) {
  if (!summary) {
    return (
      <Card>
        <CardContent className="pt-6 text-muted-foreground">
          No summary available (run may be in progress)
        </CardContent>
      </Card>
    );
  }

  const cards: { label: string; value: string }[] = [
    { label: "Episodes", value: String(summary.num_episodes) },
  ];

  if (typeof summary.success_rate === "number") {
    cards.push({ label: "Success Rate", value: `${(summary.success_rate * 100).toFixed(1)}%` });
  }
  if (typeof summary.avg_steps === "number") {
    cards.push({ label: "Avg Steps", value: String(Math.round(summary.avg_steps)) });
  }
  if (typeof summary.median_steps === "number") {
    cards.push({ label: "Median Steps", value: String(Math.round(summary.median_steps)) });
  }
  if (typeof summary.wall_clock_seconds === "number") {
    cards.push({ label: "Wall Clock", value: `${Math.round(summary.wall_clock_seconds / 60)}m` });
  }
  if (summary.llm_usage?.total_tokens) {
    cards.push({ label: "Total Tokens", value: summary.llm_usage.total_tokens.toLocaleString() });
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{c.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
