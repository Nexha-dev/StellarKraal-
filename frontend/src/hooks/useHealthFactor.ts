"use client";
import { useEffect, useRef, useState, useCallback } from "react";

const POLL_INTERVAL = 30_000;
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function useHealthFactor(loanId: string) {
  const [healthFactor, setHealthFactor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch_ = useCallback(async () => {
    if (!loanId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/api/health/${loanId}`
      );
      const data = await res.json();
      setHealthFactor(Number(data.health_factor ?? 0));
      setLastUpdated(new Date());
    } catch {
      // keep stale value on error
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  const startPolling = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (document.visibilityState === "visible") fetch_();
    }, POLL_INTERVAL);
  }, [fetch_]);

  useEffect(() => {
    if (!loanId) return;
    fetch_();
    startPolling();

    const onVisibility = () => {
      if (document.visibilityState === "visible") fetch_();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loanId, fetch_, startPolling]);

  return { healthFactor, loading, lastUpdated, refresh: fetch_ };
}
