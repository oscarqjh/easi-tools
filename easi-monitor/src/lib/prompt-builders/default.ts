import type { TrajectoryStep, RunConfig, ReconstructedMessage } from "@/types/easi";

export function reconstructDefaultPrompt(
  config: RunConfig,
  trajectory: TrajectoryStep[],
  stepIndex: number
): ReconstructedMessage[] {
  const taskDescription =
    config.task_config?.description ?? config.task_config?.display_name ?? "Unknown task";

  // Infer action space from all actions seen in the trajectory
  const actionsSeen = new Set<string>();
  for (const step of trajectory) {
    if (step.action) actionsSeen.add(step.action);
  }
  const actionList = Array.from(actionsSeen)
    .sort()
    .map((a, i) => `${i + 1}. ${a}`)
    .join("\n");

  const systemContent = `You are an embodied AI agent operating in a simulated environment. Your goal is to accomplish the given task by executing a sequence of actions.

## Task Description
${taskDescription}

## Available Actions
${actionList || "(unknown)"}

## Output Format
You must respond with a JSON object containing:
- "observation": Describe what you see in the current image
- "reasoning": Explain your step-by-step reasoning
- "plan": Your high-level plan
- "executable_plan": Array of actions to execute

## Guidelines
- You must provide at minimum 1 action in your executable_plan
- Each action must be from the Available Actions list
- You may provide up to 10 actions`;

  // Build action history up to this step
  const historyLines: string[] = [];
  for (let i = 1; i < stepIndex; i++) {
    const step = trajectory[i];
    if (step.type !== "step" || !step.action) continue;
    const feedback = step.info?.feedback ?? "";
    historyLines.push(`Step ${i}: ${step.action} -> ${feedback}`);
  }

  const actionHistory =
    historyLines.length > 0 ? historyLines.join("\n") : "This is the first step.";

  const userContent = `## Current Task
${taskDescription}

## Action History
${actionHistory}

What is your next action?

[image: current observation]`;

  return [
    { role: "system", content: systemContent },
    { role: "user", content: userContent },
  ];
}
