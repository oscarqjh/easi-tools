import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Static "RUNNING" pill rendered next to in-progress runs. No animation. */
export function RunningBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-sm border-amber-500/40 bg-amber-500/10 text-amber-500 font-mono uppercase tracking-wider text-[10px]",
        className,
      )}
    >
      Running
    </Badge>
  );
}
