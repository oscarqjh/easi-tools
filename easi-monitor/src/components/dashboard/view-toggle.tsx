"use client";

import { Button } from "@/components/ui/button";

export type ViewMode = "list" | "cards";

interface Props {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, onChange }: Props) {
  return (
    <div className="flex gap-1 border rounded-md p-1">
      <Button variant={mode === "list" ? "secondary" : "ghost"} size="sm" onClick={() => onChange("list")}>
        List
      </Button>
      <Button variant={mode === "cards" ? "secondary" : "ghost"} size="sm" onClick={() => onChange("cards")}>
        Cards
      </Button>
    </div>
  );
}
