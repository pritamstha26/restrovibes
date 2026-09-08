import { useEffect, useRef } from "react";

/**
 * Runs a refresh callback immediately, then repeatedly on the given interval.
 * The interval pauses while the document is hidden to save resources, and
 * resumes when it becomes visible again. Returns a cleanup-safe handle.
 */
export function usePolling(refreshFn, intervalMs = 5000, deps = []) {
  const refreshRef = useRef(refreshFn);
  refreshRef.current = refreshFn;

  useEffect(() => {
    let timer = null;

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(tick, intervalMs);
    };

    const tick = async () => {
      try {
        await refreshRef.current();
      } finally {
        if (!document.hidden) schedule();
      }
    };

    const onVisibility = () => {
      if (!document.hidden) {
        tick();
      } else {
        clearTimeout(timer);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    tick();

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);
}
