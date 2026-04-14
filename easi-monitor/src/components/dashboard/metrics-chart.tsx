"use client";

import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RunInfo } from "@/types/easi";

interface Props {
  runs: RunInfo[];
}

export function MetricsChart({ runs }: Props) {
  const runsWithSummary = runs.filter((r) => r.summary);

  const metricKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const r of runsWithSummary) {
      if (!r.summary) continue;
      // Top-level numeric fields
      for (const k of ["success_rate", "avg_steps", "median_steps", "early_stop_rate"] as const) {
        if (typeof (r.summary as unknown as Record<string, unknown>)[k] === "number") keys.add(k);
      }
      // Flat metrics dict
      for (const [key, val] of Object.entries(r.summary.metrics ?? {})) {
        if (typeof val === "number") keys.add(`metrics.${key}`);
      }
    }
    return Array.from(keys).sort();
  }, [runsWithSummary]);

  const [selectedMetric, setSelectedMetric] = useState<string>(
    metricKeys.includes("success_rate") ? "success_rate" : metricKeys[0] ?? ""
  );

  const chartData = useMemo(() => {
    return runsWithSummary.map((r) => {
      let value = 0;
      if (r.summary) {
        if (selectedMetric.startsWith("metrics.")) {
          const key = selectedMetric.slice("metrics.".length);
          value = (r.summary.metrics?.[key] as number) ?? 0;
        } else {
          value = (r.summary as unknown as Record<string, number>)[selectedMetric] ?? 0;
        }
      }
      return { name: r.model, value: Math.round(value * 10000) / 10000 };
    });
  }, [runsWithSummary, selectedMetric]);

  if (runsWithSummary.length < 2) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Run Comparison</CardTitle>
        <Select value={selectedMetric} onValueChange={(value) => { if (value) setSelectedMetric(value); }}>
          <SelectTrigger className="w-[250px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {metricKeys.map((k) => (
              <SelectItem key={k} value={k}>{k}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-20} textAnchor="end" height={80} fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
