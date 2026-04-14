"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TrajectoryStep } from "@/types/easi";

interface Props {
  step: TrajectoryStep | null;
  totalSteps: number;
}

export function MetadataPanel({ step, totalSteps }: Props) {
  if (!step) {
    return <div className="text-sm text-muted-foreground p-4">No step data available</div>;
  }

  const info = step.info ?? {};

  return (
    <ScrollArea className="h-[700px]">
      <div className="space-y-4 p-1">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold font-mono">Step {step.step} / {totalSteps - 1}</span>
          <Badge variant={step.type === "reset" ? "secondary" : "default"}>{step.type}</Badge>
        </div>

        {step.action && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Action</div>
            <div className="font-mono text-sm font-medium">{step.action}</div>
          </div>
        )}

        {step.triggered_fallback !== undefined && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Fallback</div>
            <Badge variant={step.triggered_fallback ? "destructive" : "outline"}>
              {step.triggered_fallback ? "Yes" : "No"}
            </Badge>
          </div>
        )}

        {info.feedback !== undefined && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Feedback</div>
            <div className="text-sm font-mono">{String(info.feedback)}</div>
          </div>
        )}

        {info.subtask_stage !== undefined && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Subtask Progress</div>
            <div className="text-sm font-mono">Stage {String(info.subtask_stage)} / {String(info.subtask_total ?? "?")}</div>
            {info.subtask_successes != null && (
              <div className="text-xs text-muted-foreground mt-1">Successes: {String(info.subtask_successes)}</div>
            )}
          </div>
        )}

        {info.current_geo_distance !== undefined && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Geo Distance</div>
            <div className="text-sm font-mono">{Number(info.current_geo_distance).toFixed(2)}m</div>
          </div>
        )}

        {step.agent_pose && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Agent Pose</div>
            <div className="text-xs font-mono">
              x: {step.agent_pose[0]?.toFixed(2)}, y: {step.agent_pose[1]?.toFixed(2)}, z: {step.agent_pose[2]?.toFixed(2)}
            </div>
            <div className="text-xs font-mono text-muted-foreground">
              rot: [{step.agent_pose.slice(3).map((v) => v.toFixed(2)).join(", ")}]
            </div>
          </div>
        )}

        <div>
          <div className="text-xs text-muted-foreground mb-1">Reward</div>
          <div className="text-sm font-mono">{step.reward}</div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Done</div>
          <Badge variant={step.done ? "default" : "outline"}>{step.done ? "Yes" : "No"}</Badge>
        </div>

        {step.llm_response != null && (
          <Accordion>
            <AccordionItem value="llm-response">
              <AccordionTrigger className="text-xs text-muted-foreground py-2">
                LLM Response
              </AccordionTrigger>
              <AccordionContent>
                <pre className="text-xs font-mono bg-muted p-3 rounded whitespace-pre-wrap break-all max-h-[300px] overflow-auto">
                  {step.llm_response}
                </pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {Object.keys(info).length > 0 && (
          <Accordion>
            <AccordionItem value="extra-info">
              <AccordionTrigger className="text-xs text-muted-foreground py-2">
                All Info Fields ({Object.keys(info).length})
              </AccordionTrigger>
              <AccordionContent>
                <pre className="text-xs font-mono bg-muted p-3 rounded whitespace-pre-wrap max-h-[300px] overflow-auto">
                  {JSON.stringify(info, null, 2)}
                </pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>
    </ScrollArea>
  );
}
