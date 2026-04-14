"use client";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type StatusFilter = "all" | "success" | "fail" | "early_stop";
export type SortField = "episode" | "steps" | "time" | "success";
export type SortDir = "asc" | "desc";

interface Props {
  status: StatusFilter;
  onStatusChange: (s: StatusFilter) => void;
  sortField: SortField;
  onSortFieldChange: (f: SortField) => void;
  sortDir: SortDir;
  onSortDirChange: (d: SortDir) => void;
}

export function EpisodeFilters({
  status, onStatusChange,
  sortField, onSortFieldChange,
  sortDir, onSortDirChange,
}: Props) {
  return (
    <div className="flex gap-3 items-center">
      <Select value={status} onValueChange={(v) => { if (v) onStatusChange(v as StatusFilter); }}>
        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="success">Success</SelectItem>
          <SelectItem value="fail">Failed</SelectItem>
          <SelectItem value="early_stop">Early Stop</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortField} onValueChange={(v) => { if (v) onSortFieldChange(v as SortField); }}>
        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="episode">Episode</SelectItem>
          <SelectItem value="steps">Steps</SelectItem>
          <SelectItem value="time">Time</SelectItem>
          <SelectItem value="success">Success</SelectItem>
        </SelectContent>
      </Select>

      <button
        className="text-sm text-muted-foreground hover:text-foreground"
        onClick={() => onSortDirChange(sortDir === "asc" ? "desc" : "asc")}
      >
        {sortDir === "asc" ? "Asc" : "Desc"}
      </button>
    </div>
  );
}
