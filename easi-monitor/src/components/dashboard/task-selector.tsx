"use client";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { TaskInfo } from "@/types/easi";

interface Props {
  tasks: TaskInfo[];
  selected: string | null;
  onSelect: (task: string) => void;
}

export function TaskSelector({ tasks, selected, onSelect }: Props) {
  return (
    <Select value={selected} onValueChange={(value) => { if (value) onSelect(value); }}>
      <SelectTrigger className="w-[300px]">
        <SelectValue placeholder="Select task" />
      </SelectTrigger>
      <SelectContent>
        {tasks.map((t) => (
          <SelectItem key={t.name} value={t.name}>
            {t.name} ({t.runCount} runs)
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
