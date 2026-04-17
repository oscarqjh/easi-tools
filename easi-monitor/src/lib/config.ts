import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export interface Source {
  name: string;
  path: string;
}

export interface TaskSpecificConfig {
  maps_dir?: string;
  datasets_dir?: string;
}

export interface MonitorConfig {
  sources: Source[];
  tasks: Record<string, TaskSpecificConfig>;
}

const CONFIG_PATHS = [
  path.resolve(process.cwd(), "monitor.yaml"),
  path.resolve(process.cwd(), "monitor.yml"),
];

export function loadConfig(): MonitorConfig {
  // Try monitor.yaml first
  for (const configPath of CONFIG_PATHS) {
    if (fs.existsSync(configPath)) {
      try {
        const raw = yaml.load(fs.readFileSync(configPath, "utf-8")) as Record<string, unknown>;
        if (raw && Array.isArray(raw.sources)) {
          const sources: Source[] = raw.sources
            .filter((s: unknown): s is Record<string, unknown> => typeof s === "object" && s !== null)
            .map((s) => ({
              name: String(s.name ?? s.path ?? "Unknown"),
              path: String(s.path ?? ""),
            }))
            .filter((s) => s.path !== "");

          const tasks: Record<string, TaskSpecificConfig> = {};
          if (raw.tasks && typeof raw.tasks === "object" && !Array.isArray(raw.tasks)) {
            for (const [key, val] of Object.entries(raw.tasks as Record<string, unknown>)) {
              if (val && typeof val === "object" && !Array.isArray(val)) {
                const v = val as Record<string, unknown>;
                const entry: TaskSpecificConfig = {};
                if (typeof v.maps_dir === "string") entry.maps_dir = v.maps_dir;
                if (typeof v.datasets_dir === "string") entry.datasets_dir = v.datasets_dir;
                tasks[key] = entry;
              }
            }
          }

          if (sources.length > 0) return { sources, tasks };
        }
      } catch { /* fall through */ }
    }
  }

  // Fallback to EASI_LOGS_DIR env var for backwards compatibility
  const envDir = process.env.EASI_LOGS_DIR;
  if (envDir) {
    return {
      sources: [{ name: "Default", path: envDir }],
      tasks: {},
    };
  }

  // Final fallback
  return {
    sources: [{ name: "Local", path: path.resolve(process.cwd(), "..", "logs") }],
    tasks: {},
  };
}

/** Find task-specific config by matching task name against prefix keys. */
export function getTaskConfig(config: MonitorConfig, taskName: string): TaskSpecificConfig | null {
  for (const [prefix, cfg] of Object.entries(config.tasks)) {
    if (taskName.startsWith(prefix)) return cfg;
  }
  return null;
}
