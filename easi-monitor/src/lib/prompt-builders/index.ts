import type { TrajectoryStep, RunConfig, ReconstructedMessage } from "@/types/easi";
import { reconstructDefaultPrompt } from "./default";
import { reconstructSFTPrompt } from "./sft";

const BUILDER_MAP: Record<
  string,
  (config: RunConfig, trajectory: TrajectoryStep[], stepIndex: number) => ReconstructedMessage[]
> = {
  "easi.agents.prompt_builder.DefaultPromptBuilder": reconstructDefaultPrompt,
  "easi.tasks.lhpr_vln.prompts.sft.LHPRVLNSFTPromptBuilder": reconstructSFTPrompt,
};

export function reconstructPrompt(
  config: RunConfig,
  trajectory: TrajectoryStep[],
  stepIndex: number
): ReconstructedMessage[] | null {
  const builderClass = config.task_config?.agent?.prompt_builder;
  if (!builderClass) return null;
  const builder = BUILDER_MAP[builderClass];
  if (!builder) return null;
  try {
    return builder(config, trajectory, stepIndex);
  } catch {
    return null;
  }
}
