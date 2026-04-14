"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { RunConfig, EpisodeResult } from "@/types/easi";

interface Props {
  task: string;
  run: string;
  ep: string;
}

export function EpisodeHeader({ task, run, ep }: Props) {
  const [result, setResult] = useState<EpisodeResult | null>(null);
  const [config, setConfig] = useState<RunConfig | null>(null);

  useEffect(() => {
    fetch(`/api/run?task=${encodeURIComponent(task)}&run=${encodeURIComponent(run)}`)
      .then((r) => r.json())
      .then((data) => setConfig(data.config ?? null))
      .catch(console.error);

    fetch(`/api/episodes?task=${encodeURIComponent(task)}&run=${encodeURIComponent(run)}`)
      .then((r) => r.json())
      .then((eps: Array<{ episodeDir: string; result: EpisodeResult | null }>) => {
        const found = eps.find((e) => e.episodeDir === ep);
        if (found?.result) setResult(found.result);
      })
      .catch(console.error);
  }, [task, run, ep]);

  if (!result) return null;

  const success = (result.task_success ?? 0) as number;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <p className="text-sm">{result.instruction}</p>
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant={success > 0 ? "default" : "destructive"}>{success > 0 ? "Success" : "Failed"}</Badge>
        {result.forced_early_stop && <Badge variant="secondary">Early Stop</Badge>}
        {typeof result.num_steps === "number" && <Badge variant="outline">{Math.round(result.num_steps as number)} steps</Badge>}
        {typeof result.elapsed_seconds === "number" && <Badge variant="outline">{Math.round(result.elapsed_seconds)}s</Badge>}
        {result.llm_usage && (
          <>
            {result.llm_usage.num_calls && <Badge variant="outline">{result.llm_usage.num_calls} LLM calls</Badge>}
            {result.llm_usage.prompt_tokens && <Badge variant="outline">{result.llm_usage.prompt_tokens.toLocaleString()} prompt tokens</Badge>}
          </>
        )}
      </div>
      {config && (
        <div className="text-xs text-muted-foreground">
          Model: {config.cli_options.model} | Backend: {config.resolved_backend}
        </div>
      )}
    </div>
  );
}
