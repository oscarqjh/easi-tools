import type { TrajectoryStep, RunConfig, ReconstructedMessage } from "@/types/easi";

const ACTION_TO_TOKEN: Record<string, string> = {
  move_forward: "<|forward|>",
  turn_left: "<|left|>",
  turn_right: "<|right|>",
  stop: "<|stop|>",
};

function sampleEvenly<T>(arr: T[], count: number): T[] {
  if (arr.length <= count) return [...arr];
  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor((i * arr.length) / count);
    result.push(arr[idx]);
  }
  return result;
}

export function reconstructSFTPrompt(
  config: RunConfig,
  trajectory: TrajectoryStep[],
  stepIndex: number
): ReconstructedMessage[] {
  const kwargs = config.task_config?.agent?.prompt_builder_kwargs ?? {};
  const windowSize = (kwargs.window_size as number) ?? 5;
  const maxHistoryImages = (kwargs.max_history_images as number) ?? 20;

  // Rebuild history images and stop count up to this step
  const historyImages: string[] = [];
  let stopCount = 0;

  for (let i = 0; i < stepIndex; i++) {
    const step = trajectory[i];
    if (step.rgb_path) {
      historyImages.push(step.rgb_path);
    }
    if (step.action === "stop") {
      stopCount++;
      historyImages.length = 0; // reset on stop, matching training
    }
  }

  // Sample history images (recent-biased)
  let sampledHistory: string[];
  if (historyImages.length <= maxHistoryImages) {
    sampledHistory = [...historyImages];
  } else {
    const recentCount = Math.floor(maxHistoryImages / 2);
    const sampledCount = maxHistoryImages - recentCount;
    const older = historyImages.slice(0, -recentCount);
    const recent = historyImages.slice(-recentCount);
    const sampled = sampleEvenly(older, sampledCount);
    sampledHistory = [...sampled, ...recent];
  }

  // Get instruction
  const instruction =
    config.task_config?.description ??
    config.task_config?.display_name ??
    "Navigate to complete the task";

  // Build content description
  const lines: string[] = [];
  lines.push(
    `You are an autonomous navigation robot. Predict the next ${windowSize} actions.`
  );
  lines.push(
    `Valid action tokens: ${Object.values(ACTION_TO_TOKEN).join(", ")}`
  );
  lines.push("");

  if (sampledHistory.length > 0) {
    lines.push(`# Historical images (${sampledHistory.length}):`);
    for (const img of sampledHistory) {
      lines.push(`  [image: ${img}]`);
    }
    lines.push("");
  }

  lines.push("# Current observations:");
  const currentStep = trajectory[stepIndex];
  if (currentStep) {
    lines.push(`  [image: left view]`);
    lines.push(`  [image: front view (${currentStep.rgb_path ?? "n/a"})]`);
    lines.push(`  [image: right view]`);
  }

  lines.push("");
  lines.push(`# Mission: ${instruction}`);
  lines.push(`# Stop count: ${stopCount}`);
  lines.push(`<|NAV|>`);

  return [{ role: "user", content: lines.join("\n") }];
}
