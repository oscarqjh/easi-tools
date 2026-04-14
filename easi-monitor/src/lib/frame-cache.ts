"use client";

const MAX_CACHE_SIZE = 100;

/**
 * Blob-based frame cache. Fetches images as blobs and creates object URLs
 * so cached frames display instantly with zero network latency.
 */
class FrameCache {
  private cache = new Map<string, { blobUrl: string; lastAccess: number }>();
  private loading = new Map<string, AbortController>();
  private prefetchTimer: ReturnType<typeof setTimeout> | null = null;

  private makeKey(task: string, run: string, ep: string, step: number, camera: string): string {
    return `${task}/${run}/${ep}/${step}/${camera}`;
  }

  makeUrl(task: string, run: string, ep: string, step: number, camera: string): string {
    return `/api/frame?task=${encodeURIComponent(task)}&run=${encodeURIComponent(run)}&ep=${encodeURIComponent(ep)}&step=${step}&camera=${camera}`;
  }

  /** Get cached blob URL, or null if not cached. */
  getCachedUrl(task: string, run: string, ep: string, step: number, camera: string): string | null {
    const key = this.makeKey(task, run, ep, step, camera);
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastAccess = Date.now();
      return entry.blobUrl;
    }
    return null;
  }

  /** Get blob URL if cached, otherwise the API URL as fallback. */
  getUrl(task: string, run: string, ep: string, step: number, camera: string): string {
    return this.getCachedUrl(task, run, ep, step, camera)
      ?? this.makeUrl(task, run, ep, step, camera);
  }

  /** Fetch a single frame as blob and cache it. Returns the blob URL. */
  async fetchFrame(task: string, run: string, ep: string, step: number, camera: string): Promise<string> {
    const key = this.makeKey(task, run, ep, step, camera);

    // Already cached
    const existing = this.cache.get(key);
    if (existing) {
      existing.lastAccess = Date.now();
      return existing.blobUrl;
    }

    // Already loading — wait for it
    if (this.loading.has(key)) {
      return this.makeUrl(task, run, ep, step, camera);
    }

    const controller = new AbortController();
    this.loading.set(key, controller);

    try {
      const resp = await fetch(this.makeUrl(task, run, ep, step, camera), {
        signal: controller.signal,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      this.cache.set(key, { blobUrl, lastAccess: Date.now() });
      this.evict();
      return blobUrl;
    } catch {
      return this.makeUrl(task, run, ep, step, camera);
    } finally {
      this.loading.delete(key);
    }
  }

  /**
   * Debounced prefetch: cancels stale prefetches, waits 150ms after last call,
   * then fetches frames around the current step.
   */
  schedulePrefetch(
    task: string, run: string, ep: string,
    currentStep: number, maxStep: number, camera: string,
    range: number = 15
  ): void {
    // Cancel any pending prefetch scheduling
    if (this.prefetchTimer) {
      clearTimeout(this.prefetchTimer);
    }

    this.prefetchTimer = setTimeout(() => {
      // Cancel all in-flight prefetches that are far from current position
      for (const [key, controller] of this.loading) {
        const stepMatch = key.match(/\/(\d+)\//);
        if (stepMatch) {
          const loadingStep = parseInt(stepMatch[1], 10);
          if (Math.abs(loadingStep - currentStep) > range) {
            controller.abort();
            this.loading.delete(key);
          }
        }
      }

      // Prefetch in priority order: current first, then outward
      const start = Math.max(0, currentStep - range);
      const end = Math.min(maxStep, currentStep + range);
      const steps: number[] = [currentStep];
      for (let offset = 1; offset <= range; offset++) {
        if (currentStep + offset <= end) steps.push(currentStep + offset);
        if (currentStep - offset >= start) steps.push(currentStep - offset);
      }

      for (const s of steps) {
        const key = this.makeKey(task, run, ep, s, camera);
        if (this.cache.has(key) || this.loading.has(key)) continue;

        const controller = new AbortController();
        this.loading.set(key, controller);
        const url = this.makeUrl(task, run, ep, s, camera);

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
    }, 150);
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
