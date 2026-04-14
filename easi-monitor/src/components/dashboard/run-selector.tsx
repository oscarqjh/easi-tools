"use client";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { RunInfo } from "@/types/easi";

interface Props {
  runs: RunInfo[];
  selected: string | null;
  onSelect: (runId: string) => void;
}

export function RunSelector({ runs, selected, onSelect }: Props) {
  return (
    <Select value={selected} onValueChange={(value) => { if (value) onSelect(value); }}>
      <SelectTrigger className="w-[400px]">
        <SelectValue placeholder="Select run" />
      </SelectTrigger>
      <SelectContent>
        {runs.map((r) => (
          <SelectItem key={r.runId} value={r.runId}>
            <span className="font-mono text-sm">{r.model}</span>
            <span className="ml-2 text-muted-foreground text-xs">{r.date}</span>
            {!r.hasSummary && (
              <span className="ml-2 text-yellow-500 text-xs">(in progress)</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
