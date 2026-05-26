import { useState, useRef, useCallback } from "react";

/**
 * Returns [isLoading, withMinLoading].
 * Wraps an async operation so the loading state stays true for at least `ms` milliseconds.
 * Errors are re-thrown after the minimum delay.
 */
export function useMinLoadingTime(ms = 300) {
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const withMinLoading = useCallback(
    async (fn: () => Promise<void>) => {
      setIsLoading(true);
      const start = Date.now();
      let error: unknown;
      try {
        await fn();
      } catch (e) {
        error = e;
      } finally {
        const elapsed = Date.now() - start;
        const remaining = ms - elapsed;
        if (remaining > 0) {
          await new Promise((r) => {
            timerRef.current = setTimeout(r, remaining);
          });
        }
        setIsLoading(false);
      }
      if (error !== undefined) throw error;
    },
    [ms]
  );

  return [isLoading, withMinLoading] as const;
}
