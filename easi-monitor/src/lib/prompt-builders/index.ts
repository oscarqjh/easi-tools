import type { TrajectoryStep, RunConfig, ReconstructedMessage } from "@/types/easi";
import { reconstructDefaultPrompt } from "./default";
import { reconstructSFTPrompt } from "./sft";

type PromptBuilder = (
  config: RunConfig,
  trajectory: TrajectoryStep[],
  stepIndex: number,
  episodeInstruction?: string,
) => ReconstructedMessage[];

const BUILDER_MAP: Record<string, PromptBuilder> = {
  "easi.agents.prompt_builder.DefaultPromptBuilder": reconstructDefaultPrompt,
  "easi.tasks.lhpr_vln.prompts.sft.LHPRVLNSFTPromptBuilder": reconstructSFTPrompt,
};

export function reconstructPrompt(
  config: RunConfig,
  trajectory: TrajectoryStep[],
  stepIndex: number,
  episodeInstruction?: string,
): ReconstructedMessage[] | null {
  const builderClass = config.task_config?.agent?.prompt_builder;
  if (!builderClass) return null;
  const builder = BUILDER_MAP[builderClass];
  if (!builder) return null;
  try {
    return builder(config, trajectory, stepIndex, episodeInstruction);
  } catch {
    return null;
  }
}
