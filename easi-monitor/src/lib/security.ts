import { loadConfig } from "./config";

/**
 * Validate that a source path matches one of the configured sources.
 * Returns the validated path, or the first configured source if null.
 */
export function validateSource(sourcePath: string | null): string {
  const config = loadConfig();
  if (!sourcePath) return config.sources[0]?.path ?? "";
  const match = config.sources.find((s) => s.path === sourcePath);
  if (!match) throw new Error("Invalid source path");
  return match.path;
}

/**
 * Sanitize a path segment (task name, run ID, episode dir).
 * Rejects values containing path traversal or separators.
 */
export function sanitizeSegment(value: string): string {
  if (value.includes("..") || value.includes("/") || value.includes("\\") || value.includes("\0")) {
    throw new Error("Invalid path segment");
  }
  return value;
}
