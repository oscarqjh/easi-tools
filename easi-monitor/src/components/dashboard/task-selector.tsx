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
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">Task</label>
      <Select value={selected} onValueChange={(value) => { if (value) onSelect(value); }}>
        <SelectTrigger className="w-full sm:w-[300px]">
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
    </div>
  );
}
