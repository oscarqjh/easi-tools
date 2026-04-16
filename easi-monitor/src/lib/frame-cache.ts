"use client";

const MAX_CACHE_SIZE = 200;

/**
 * Blob-based frame cache. Fetches images as blobs and creates object URLs
 * so cached frames display instantly with zero network latency.
 */
class FrameCache {
  private cache = new Map<string, { blobUrl: string; lastAccess: number }>();
  private loading = new Map<string, AbortController>();
  private prefetchTimer: ReturnType<typeof setTimeout> | null = null;

  private makeKey(task: string, run: string, ep: string, step: number, camera: string, source?: string | null): string {
    return `${source ?? ""}/${task}/${run}/${ep}/${step}/${camera}`;
  }

  makeUrl(task: string, run: string, ep: string, step: number, camera: string, source?: string | null): string {
    const params = new URLSearchParams({ task, run, ep, step: String(step), camera });
    if (source) params.set("source", source);
    return `/api/frame?${params.toString()}`;
  }

  /** Get cached blob URL, or null if not cached. */
  getCachedUrl(task: string, run: string, ep: string, step: number, camera: string, source?: string | null): string | null {
    const key = this.makeKey(task, run, ep, step, camera, source);
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastAccess = Date.now();
      return entry.blobUrl;
    }
    return null;
  }

  /** Get blob URL if cached, otherwise the API URL as fallback. */
  getUrl(task: string, run: string, ep: string, step: number, camera: string, source?: string | null): string {
    return this.getCachedUrl(task, run, ep, step, camera, source)
      ?? this.makeUrl(task, run, ep, step, camera, source);
  }

  /** Fetch a single frame as blob and cache it. Returns the blob URL. */
  async fetchFrame(task: string, run: string, ep: string, step: number, camera: string, source?: string | null): Promise<string> {
    const key = this.makeKey(task, run, ep, step, camera, source);

    // Already cached
    const existing = this.cache.get(key);
    if (existing) {
      existing.lastAccess = Date.now();
      return existing.blobUrl;
    }

    // Already loading — wait for it
    if (this.loading.has(key)) {
      return this.makeUrl(task, run, ep, step, camera, source);
    }

    const controller = new AbortController();
    this.loading.set(key, controller);

    try {
      const resp = await fetch(this.makeUrl(task, run, ep, step, camera, source), {
        signal: controller.signal,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      this.cache.set(key, { blobUrl, lastAccess: Date.now() });
      this.evict();
      return blobUrl;
    } catch {
      return this.makeUrl(task, run, ep, step, camera, source);
    } finally {
      this.loading.delete(key);
    }
  }

  /**
   * Debounced prefetch: cancels stale prefetches, then fetches frames
   * around the current step. When playing, biases heavily forward and
   * scales range with speed.
   */
  schedulePrefetch(
    task: string, run: string, ep: string,
    currentStep: number, maxStep: number, camera: string,
    range: number = 15, source?: string | null,
    playing: boolean = false, speed: number = 1,
  ): void {
    // Cancel any pending prefetch scheduling
    if (this.prefetchTimer) {
      clearTimeout(this.prefetchTimer);
    }

    // Shorter debounce when playing (need frames faster)
    const debounceMs = playing ? 30 : 150;

    this.prefetchTimer = setTimeout(() => {
      // Scale range with speed when playing
      const effectiveRange = playing ? Math.max(range, speed * 15) : range;

      // Cancel all in-flight prefetches that are far from current position
      for (const [key, controller] of this.loading) {
        const stepMatch = key.match(/\/(\d+)\//);
        if (stepMatch) {
          const loadingStep = parseInt(stepMatch[1], 10);
          if (Math.abs(loadingStep - currentStep) > effectiveRange) {
            controller.abort();
            this.loading.delete(key);
          }
        }
      }

      // Build prefetch list: when playing, bias forward (90% ahead, 10% behind)
      const steps: number[] = [currentStep];
      if (playing) {
        const forwardRange = Math.min(maxStep - currentStep, Math.ceil(effectiveRange * 0.9));
        const backRange = Math.min(currentStep, Math.ceil(effectiveRange * 0.1));
        // Forward frames first (most important during playback)
        for (let i = 1; i <= forwardRange; i++) {
          steps.push(currentStep + i);
        }
        // A few behind for backward stepping
        for (let i = 1; i <= backRange; i++) {
          steps.push(currentStep - i);
        }
      } else {
        // Symmetric when paused
        const start = Math.max(0, currentStep - effectiveRange);
        const end = Math.min(maxStep, currentStep + effectiveRange);
        for (let offset = 1; offset <= effectiveRange; offset++) {
          if (currentStep + offset <= end) steps.push(currentStep + offset);
          if (currentStep - offset >= start) steps.push(currentStep - offset);
        }
      }

      for (const s of steps) {
        const key = this.makeKey(task, run, ep, s, camera, source);
        if (this.cache.has(key) || this.loading.has(key)) continue;

        const controller = new AbortController();
        this.loading.set(key, controller);
        const url = this.makeUrl(task, run, ep, s, camera, source);

        fetch(url, { signal: controller.signal })
          .then((resp) => {
            if (!resp.ok) throw new Error();
            return resp.blob();
          })
          .then((blob) => {
            const blobUrl = URL.createObjectURL(blob);
            this.cache.set(key, { blobUrl, lastAccess: Date.now() });
            this.evict();
          })
          .catch(() => {})
          .finally(() => this.loading.delete(key));
      }
    }, debounceMs);
  }

  private evict(): void {
    while (this.cache.size > MAX_CACHE_SIZE) {
      let oldestKey = "";
      let oldestTime = Infinity;
      for (const [k, v] of this.cache) {
        if (v.lastAccess < oldestTime) { oldestTime = v.lastAccess; oldestKey = k; }
      }
      if (oldestKey) {
        const entry = this.cache.get(oldestKey);
        if (entry) URL.revokeObjectURL(entry.blobUrl);
        this.cache.delete(oldestKey);
      }
    }
  }
}

export const frameCache = new FrameCache();
