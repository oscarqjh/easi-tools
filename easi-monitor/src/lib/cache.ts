/**
 * Simple in-memory TTL cache for server-side use.
 * Module-level singleton — shared across all API requests in the same process.
 */
export class TTLCache<T> {
  private cache = new Map<string, { data: T; expires: number }>();

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, { data, expires: Date.now() + ttlMs });
  }

  clear(): void {
    this.cache.clear();
  }
}
