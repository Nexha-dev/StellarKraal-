"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export interface FilterState {
  query: string;
  statuses: string[];
  types: string[];
}

const EMPTY: FilterState = { query: "", statuses: [], types: [] };

/**
 * Hook that manages search/filter state with 300ms debounce and URL sync.
 * State is preserved on back navigation via URL query params.
 */
export function useSearchFilter(debounceMs = 300) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialise from URL
  const [filters, setFilters] = useState<FilterState>(() => ({
    query: searchParams.get("q") ?? "",
    statuses: searchParams.getAll("status"),
    types: searchParams.getAll("type"),
  }));

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync filters → URL (debounced for query, immediate for chips)
  const syncUrl = useCallback(
    (next: FilterState, immediate = false) => {
      const apply = () => {
        const params = new URLSearchParams();
        if (next.query) params.set("q", next.query);
        next.statuses.forEach((s) => params.append("status", s));
        next.types.forEach((t) => params.append("type", t));
        const qs = params.toString();
        router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
      };

      if (immediate) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        apply();
      } else {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(apply, debounceMs);
      }
    },
    [router, pathname, debounceMs]
  );

  const setQuery = useCallback(
    (query: string) => {
      const next = { ...filters, query };
      setFilters(next);
      syncUrl(next, false);
    },
    [filters, syncUrl]
  );

  const toggleStatus = useCallback(
    (status: string) => {
      const statuses = filters.statuses.includes(status)
        ? filters.statuses.filter((s) => s !== status)
        : [...filters.statuses, status];
      const next = { ...filters, statuses };
      setFilters(next);
      syncUrl(next, true);
    },
    [filters, syncUrl]
  );

  const toggleType = useCallback(
    (type: string) => {
      const types = filters.types.includes(type)
        ? filters.types.filter((t) => t !== type)
        : [...filters.types, type];
      const next = { ...filters, types };
      setFilters(next);
      syncUrl(next, true);
    },
    [filters, syncUrl]
  );

  const removeStatus = useCallback(
    (status: string) => toggleStatus(status),
    [toggleStatus]
  );

  const removeType = useCallback(
    (type: string) => toggleType(type),
    [toggleType]
  );

  const clearAll = useCallback(() => {
    setFilters(EMPTY);
    syncUrl(EMPTY, true);
  }, [syncUrl]);

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const hasActiveFilters =
    filters.query !== "" || filters.statuses.length > 0 || filters.types.length > 0;

  return {
    filters,
    setQuery,
    toggleStatus,
    toggleType,
    removeStatus,
    removeType,
    clearAll,
    hasActiveFilters,
  };
}
