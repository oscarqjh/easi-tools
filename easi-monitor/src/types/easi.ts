/** Map metadata types */
export interface RenderParams {
  width: number;
  height: number;
  ortho_scale: number;
  center_x: number;
  center_z: number;
}

export interface FloorHeights {
  floor_heights: number[];
  num_floors: number;
}

export interface MapMeta {
  render_params: RenderParams;
  floor_heights: FloorHeights;
}

/** config.json — run-level configuration */
export interface RunConfig {
  run_id: string;
  total_episodes: number;
  num_parallel?: number;
  cli_options: {
    task_name: string;
    agent_type: string;
    output_dir: string;
    model: string;
    backend: string;
    num_parallel?: number;
    port?: number;
    llm_kwargs_raw?: string;
    llm_instances?: number;
    llm_gpus?: number[];
    sim_gpus?: number[];
    [key: string]: unknown;
  };
  resolved_backend: string | null;
  resolved_base_url: string | null;
  resolved_generation_kwargs: Record<string, unknown>;
  task_config: TaskConfig;
}

export interface TaskConfig {
  display_name?: string;
  description?: string;
  simulator: string;
  task_class: string;
  max_steps: number;
  dataset?: Record<string, unknown>;
  simulator_configs?: Record<string, unknown>;
  agent: AgentConfig;
  name: string;
  [key: string]: unknown;
}

export interface AgentConfig {
  prompt_builder?: string;
  prompt_builder_kwargs?: Record<string, unknown>;
  fallback_strategy?: string;
  fallback_action?: string;
  max_fallback_retries?: number;
  max_consecutive_fallbacks?: number;
  generation_kwargs?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface RunSummary {
  num_episodes: number;
  success_rate: number;
  avg_steps: number;
  median_steps: number;
  early_stop_rate?: number;
  effective_episodes?: number;
  metrics: Record<string, number>;
  num_parallel?: number;
  wall_clock_seconds?: number;
  llm_usage?: LLMUsage;
  model: string;
  backend: string;
}

export interface LLMUsage {
  total_calls?: number;
  total_prompt_tokens?: number;
  total_completion_tokens?: number;
  total_tokens?: number;
  total_cost_usd?: number;
  avg_prompt_tokens_per_episode?: number;
  avg_cost_per_episode_usd?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  num_calls?: number;
  cost_usd?: number;
}

export interface EpisodeResult {
  episode_id: string;
  instruction: string;
  elapsed_seconds: number;
  forced_early_stop: boolean;
  llm_usage?: LLMUsage;
  [key: string]: unknown;
}

export interface TrajectoryStep {
  step: number;
  type: "reset" | "step";
  rgb_path?: string;
  agent_pose?: number[];
  reward: number;
  done: boolean;
  info: Record<string, unknown>;
  action?: string;
  llm_response?: string | null;
  triggered_fallback?: boolean;
}

export interface TaskInfo {
  name: string;
  runCount: number;
  source: string;
  sourcePath: string;
}

export interface RunInfo {
  runId: string;
  model: string;
  date: string;
  hasSummary: boolean;
  summary: RunSummary | null;
  config: RunConfig | null;
  source: string;
  sourcePath: string;
}

export interface EpisodeInfo {
  episodeDir: string;
  episodeId: string;
  result: EpisodeResult | null;
  hasImages: boolean;
  hasZip: boolean;
  stepCount: number;
}

export interface ReconstructedMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OverviewData {
  totalRuns: number;
  totalTasks: number;
  totalEpisodes: number;
  avgSuccessRate: number;
  tasks: OverviewTask[];
  recentRuns: RecentRun[];
}

export interface OverviewTask {
  name: string;
  runCount: number;
  source: string;
  sourcePath: string;
  latestRun: {
    runId: string;
    model: string;
    date: string;
    successRate: number | null;
    hasSummary: boolean;
  } | null;
}

export interface RecentRun {
  task: string;
  runId: string;
  model: string;
  date: string;
  successRate: number | null;
  numEpisodes: number | null;
  hasSummary: boolean;
  source: string;
  sourcePath: string;
}
