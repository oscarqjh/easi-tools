"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { RunConfig, EpisodeResult } from "@/types/easi";

interface Props {
  task: string;
  run: string;
  ep: string;
  sourcePath?: string | null;
  config?: RunConfig | null;
  result?: EpisodeResult | null;
}

export function EpisodeHeader({ task, run, ep, sourcePath, config: configProp, result: resultProp }: Props) {
  const [result, setResult] = useState<EpisodeResult | null>(resultProp ?? null);
  const [config, setConfig] = useState<RunConfig | null>(configProp ?? null);

  const sourceParam = sourcePath ? `&source=${encodeURIComponent(sourcePath)}` : "";

  // Sync state when props change (parent fetches async, props arrive later)
  useEffect(() => {
    if (resultProp) setResult(resultProp);
  }, [resultProp]);

  useEffect(() => {
    if (configProp) setConfig(configProp);
  }, [configProp]);

  useEffect(() => {
    if (configProp !== undefined) return;
    fetch(`/api/run?task=${encodeURIComponent(task)}&run=${encodeURIComponent(run)}${sourceParam}`)
      .then((r) => r.json())
      .then((data) => setConfig(data.config ?? null))
      .catch(console.error);
  }, [task, run, sourceParam, configProp]);

  useEffect(() => {
    if (resultProp !== undefined) return;
    fetch(`/api/episodes?task=${encodeURIComponent(task)}&run=${encodeURIComponent(run)}${sourceParam}`)
      .then((r) => r.json())
      .then((eps: Array<{ episodeDir: string; result: EpisodeResult | null }>) => {
        const found = eps.find((e) => e.episodeDir === ep);
        if (found?.result) setResult(found.result);
      })
      .catch(console.error);
  }, [task, run, ep, sourceParam, resultProp]);

  if (!result) return null;

  const success = (result.task_success ?? result.success ?? 0) as number;

  return (
    <div className="border rounded-sm p-4 space-y-3">
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">Episode</div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-bold text-primary">{ep}</span>
        <Badge variant={success > 0 ? "default" : "destructive"}>
          {success > 0 ? "Success" : "Failed"}
        </Badge>
        {result.forced_early_stop && <Badge variant="secondary">Early Stop</Badge>}
      </div>

      <p className="text-base leading-relaxed font-sans">{result.instruction}</p>

      <div className="flex flex-wrap gap-2 text-xs">
        {typeof result.num_steps === "number" && <Badge variant="outline">{Math.round(result.num_steps as number)} steps</Badge>}
        {typeof result.elapsed_seconds === "number" && <Badge variant="outline">{Math.round(result.elapsed_seconds)}s</Badge>}
        <span className="w-px h-4 bg-border self-center" />
        {result.llm_usage && (
          <>
            {result.llm_usage.num_calls && <Badge variant="outline">{result.llm_usage.num_calls} LLM calls</Badge>}
            {result.llm_usage.prompt_tokens && <Badge variant="outline">{result.llm_usage.prompt_tokens.toLocaleString()} prompt tokens</Badge>}
          </>
        )}
      </div>

      {config && (
        <div className="text-xs text-muted-foreground font-mono border-t border-border pt-3">
          Model: {config.cli_options.model} | Backend: {config.resolved_backend}
        </div>
      )}
    </div>
  );
}
