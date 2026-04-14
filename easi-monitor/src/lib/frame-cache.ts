"use client";

const MAX_CACHE_SIZE = 50;

class FrameCache {
  private cache = new Map<string, { url: string; lastAccess: number }>();
  private loading = new Set<string>();

  private makeKey(task: string, run: string, ep: string, step: number, camera: string): string {
    return `${task}/${run}/${ep}/${step}/${camera}`;
  }

  makeUrl(task: string, run: string, ep: string, step: number, camera: string): string {
    return `/api/frame?task=${encodeURIComponent(task)}&run=${encodeURIComponent(run)}&ep=${encodeURIComponent(ep)}&step=${step}&camera=${camera}`;
  }

  getUrl(task: string, run: string, ep: string, step: number, camera: string): string {
    const key = this.makeKey(task, run, ep, step, camera);
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastAccess = Date.now();
      return entry.url;
    }
    return this.makeUrl(task, run, ep, step, camera);
  }

  prefetch(task: string, run: string, ep: string, currentStep: number, maxStep: number, camera: string, range: number = 10): void {
    const start = Math.max(0, currentStep - range);
    const end = Math.min(maxStep, currentStep + range);
    for (let s = start; s <= end; s++) {
      const key = this.makeKey(task, run, ep, s, camera);
      if (this.cache.has(key) || this.loading.has(key)) continue;
      this.loading.add(key);
      const url = this.makeUrl(task, run, ep, s, camera);
      const img = new Image();
      img.onload = () => {
        this.loading.delete(key);
        this.cache.set(key, { url, lastAccess: Date.now() });
        this.evict();
      };
      img.onerror = () => this.loading.delete(key);
      img.src = url;
    }
  }

  private evict(): void {
    while (this.cache.size > MAX_CACHE_SIZE) {
      let oldestKey = "";
      let oldestTime = Infinity;
      for (const [k, v] of this.cache) {
        if (v.lastAccess < oldestTime) { oldestTime = v.lastAccess; oldestKey = k; }
      }
      if (oldestKey) this.cache.delete(oldestKey);
    }
  }
}

export const frameCache = new FrameCache();
