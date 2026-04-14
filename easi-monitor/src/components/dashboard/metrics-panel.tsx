"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hash, CheckCircle, Footprints, Clock, MessageSquare, BarChart3 } from "lucide-react";
import type { RunSummary } from "@/types/easi";
import type { ReactNode } from "react";

interface Props {
  summary: RunSummary | null;
}

interface MetricCard {
  label: string;
  value: string;
  icon: ReactNode;
  borderColor: string;
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

  const cards: MetricCard[] = [
    {
      label: "Episodes",
      value: String(summary.num_episodes),
      icon: <Hash className="size-4 text-blue-400" />,
      borderColor: "border-l-blue-400",
    },
  ];

  if (typeof summary.success_rate === "number") {
    cards.push({
      label: "Success Rate",
      value: `${(summary.success_rate * 100).toFixed(1)}%`,
      icon: <CheckCircle className="size-4 text-green-400" />,
      borderColor: "border-l-green-400",
    });
  }
  if (typeof summary.avg_steps === "number") {
    cards.push({
      label: "Avg Steps",
      value: String(Math.round(summary.avg_steps)),
      icon: <Footprints className="size-4 text-orange-400" />,
      borderColor: "border-l-orange-400",
    });
  }
  if (typeof summary.median_steps === "number") {
    cards.push({
      label: "Median Steps",
      value: String(Math.round(summary.median_steps)),
      icon: <BarChart3 className="size-4 text-purple-400" />,
      borderColor: "border-l-purple-400",
    });
  }
  if (typeof summary.wall_clock_seconds === "number") {
    cards.push({
      label: "Wall Clock",
      value: `${Math.round(summary.wall_clock_seconds / 60)}m`,
      icon: <Clock className="size-4 text-cyan-400" />,
      borderColor: "border-l-cyan-400",
    });
  }
  if (summary.llm_usage?.total_tokens) {
    cards.push({
      label: "Total Tokens",
      value: summary.llm_usage.total_tokens.toLocaleString(),
      icon: <MessageSquare className="size-4 text-pink-400" />,
      borderColor: "border-l-pink-400",
    });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className={`border-l-4 ${c.borderColor}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              {c.icon}
              {c.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{c.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
