"use client";

const marks = new Map<string, number>();

export const perf = {
  start(label: string): void {
    if (typeof performance === "undefined") return;
    marks.set(label, performance.now());
  },

  end(label: string): number | null {
    if (typeof performance === "undefined") return null;
    const start = marks.get(label);
    if (start === undefined) return null;
    const elapsed = performance.now() - start;
    marks.delete(label);
    if (elapsed > 100) {
      if (typeof console !== "undefined") {
        console.warn(`[PERF] ${label}: ${Math.round(elapsed)}ms`);
      }
    }
    return elapsed;
  },

  measure(component: string, phase: string, duration: number): void {
    if (duration > 16) {
      if (typeof console !== "undefined") {
        console.warn(`[PERF] ${component} ${phase}: ${Math.round(duration)}ms (frame budget: 16ms)`);
      }
    }
  },
};

export function useRenderTiming(componentName: string): void {
  if (typeof window === "undefined") return;
  const start = performance.now();
  if (typeof requestAnimationFrame !== "undefined") {
    requestAnimationFrame(() => {
      const elapsed = performance.now() - start;
      if (elapsed > 16) {
        if (typeof console !== "undefined") {
          console.warn(`[PERF] ${componentName} render: ${Math.round(elapsed)}ms`);
        }
      }
    });
  }
}

let isLogged = false;
export function logBundleSizes(): void {
  if (isLogged || typeof window === "undefined") return;
  isLogged = true;
  if (typeof performance !== "undefined" && "memory" in performance) {
    const mem = (performance as unknown as { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    if (mem) {
      const usedMB = Math.round(mem.usedJSHeapSize / 1024 / 1024);
      const limitMB = Math.round(mem.jsHeapSizeLimit / 1024 / 1024);
      if (typeof console !== "undefined") {
        console.info(`[PERF] Memory: ${usedMB}MB / ${limitMB}MB`);
      }
    }
  }
}

export function debouncedRender(fn: () => void, delay: number = 100): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}
