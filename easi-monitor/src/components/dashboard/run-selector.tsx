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
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">Run</label>
      <Select value={selected} onValueChange={(value) => { if (value) onSelect(value); }}>
        <SelectTrigger className="w-full sm:w-[400px]">
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
    </div>
  );
}
