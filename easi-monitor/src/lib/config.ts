import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export interface Source {
  name: string;
  path: string;
}

export interface MonitorConfig {
  sources: Source[];
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
          if (sources.length > 0) return { sources };
        }
      } catch { /* fall through */ }
    }
  }

  // Fallback to EASI_LOGS_DIR env var for backwards compatibility
  const envDir = process.env.EASI_LOGS_DIR;
  if (envDir) {
    return {
      sources: [{ name: "Default", path: envDir }],
    };
  }

  // Final fallback
  return {
    sources: [{ name: "Local", path: path.resolve(process.cwd(), "..", "logs") }],
  };
}
