"use client";
import { useEffect, useState, useCallback } from "react";

export type Currency = "KES" | "NGN" | "GHS" | "USD";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const STALE_TTL = 10 * 60 * 1000; // 10 minutes

interface RateCache {
  rates: Record<Currency, number>;
  fetchedAt: number;
}

let cache: RateCache | null = null;

async function fetchRates(): Promise<Record<Currency, number>> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=kes,ngn,ghs,usd"
  );
  if (!res.ok) throw new Error("Failed to fetch rates");
  const data = await res.json();
  return {
    KES: data.stellar.kes,
    NGN: data.stellar.ngn,
    GHS: data.stellar.ghs,
    USD: data.stellar.usd,
  };
}

export function useCurrencyConversion() {
  const [rates, setRates] = useState<Record<Currency, number> | null>(
    cache ? cache.rates : null
  );
  const [fetchedAt, setFetchedAt] = useState<number | null>(
    cache ? cache.fetchedAt : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cache && now - cache.fetchedAt < CACHE_TTL) {
      setRates(cache.rates);
      setFetchedAt(cache.fetchedAt);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetchRates();
      cache = { rates: r, fetchedAt: now };
      setRates(r);
      setFetchedAt(now);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isStale = fetchedAt ? Date.now() - fetchedAt > STALE_TTL : false;

  function convert(xlmAmount: number, currency: Currency): number | null {
    if (!rates) return null;
    return xlmAmount * rates[currency];
  }

  return { rates, loading, error, isStale, fetchedAt, convert, refresh };
}
