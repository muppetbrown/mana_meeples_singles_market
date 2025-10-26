// apps/web/src/hooks/useFilterCounts.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { FILTER_CONFIG, ERROR_CONFIG } from '@/lib/constants';
import { api } from '@/lib/api';

type Filters = Record<string, string | number | boolean | undefined | null>;

type CountPayload = {
  total: number;
};

const globalCache: {
  data: CountPayload | null;
  timestamp: number | null;
  filters: Filters | null;
} = {
  data: null,
  timestamp: null,
  filters: null,
};

const CACHE_DURATION = FILTER_CONFIG.CACHE_DURATION;
const DEBOUNCE_DELAY = FILTER_CONFIG.DEBOUNCE_DELAY;
const MAX_RETRIES = ERROR_CONFIG.DEFAULT_MAX_RETRIES;
const RETRY_DELAY = ERROR_CONFIG.DEFAULT_RETRY_DELAY;

/**
 * Hook to retrieve the total card count for the current filters, with caching, debouncing, and retry.
 *
 * NOTE: This replaces the old `/filters/counts` (per-option) endpoint.
 * It now reads `/cards/count` (single total). The old helpers `getCount` and
 * `getOptionsWithCounts` are retained as safe no-ops to avoid breakage while you migrate UIs.
 */
export const useFilterCounts = (_deprecatedAPIBase: unknown, currentFilters: Filters = {}) => {
  const [count, setCount] = useState<number>(globalCache.data?.total ?? 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchRef = useRef(0);

  const isCacheValid = useCallback(() => {
    if (!globalCache.data || !globalCache.timestamp) return false;
    const cacheAge = Date.now() - globalCache.timestamp;

    const cachedFilters = globalCache.filters || {};
    const keysA = Object.keys(currentFilters);
    const keysB = Object.keys(cachedFilters);

    if (keysA.length !== keysB.length) return false;
    for (const k of keysA) {
      if ((cachedFilters as any)[k] !== (currentFilters as any)[k]) return false;
    }
    return cacheAge < CACHE_DURATION;
  }, [currentFilters]);

  const fetchCount = useCallback(
    async (filters: Filters = {}, retryCount = 0) => {
      // Simple rate-limit: 1 request per second
      const now = Date.now();
      if (now - lastFetchRef.current < 1000) return;
      lastFetchRef.current = now;

      // Abort any pending request
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        // Only include meaningful filters (omit "all" and falsy)
        for (const [key, raw] of Object.entries(filters)) {
          if (raw === undefined || raw === null) continue;
          const val = String(raw).trim();
          if (!val || val === 'all') continue;
          params.append(key, val);
        }

        // Use the shared api client (handles API_BASE and credentials)
        const res = await api.get<{ count?: number }>(
          `/cards/count?${params.toString()}`,
        );

        const total = typeof res?.count === 'number' ? res.count : 0;

        // Update cache
        globalCache.data = { total };
        globalCache.timestamp = Date.now();
        globalCache.filters = { ...filters };

        setCount(total);
        setError(null);
      } catch (e: any) {
        // Handle fetch aborts quietly
        if (e?.name === 'AbortError') return;

        // Retry on transient 429/5xx (api.get throws; we inspect message)
        const msg = String(e?.message ?? e);
        const transient =
          /503|504|timeout|network/i.test(msg) ||
          e?.status === ERROR_CONFIG.RATE_LIMIT_STATUS ||
          e?.status === 503 ||
          e?.status === 504;

        if (transient && retryCount < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY * Math.pow(2, retryCount)));
          return fetchCount(filters, retryCount + 1);
        }

        setError(typeof e?.message === 'string' ? e.message : 'Failed to fetch count');

        // Fall back to cached total if we have one
        if (globalCache.data) {
          setCount(globalCache.data.total);
        } else {
          setCount(0);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (isCacheValid()) {
      setCount(globalCache.data!.total);
      return;
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchCount(currentFilters);
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [currentFilters, fetchCount, isCacheValid]);

  // ─── Back-compat no-ops (will be removed when UI migrates) ─────────────
  const formatCount = (n: number | undefined | null) =>
    !n ? '' : n < 1000 ? `(${n})` : n < 1_000_000 ? `(${(n / 1000).toFixed(1)}k)` : `(${(n / 1_000_000).toFixed(1)}M)`;

  const getCount = (_category: unknown, _value: unknown) => {
    // Old API returned per-option counts; we now only track total.
    // Keep signature but return empty string to avoid breaking UI conditionals.
    return '';
  };

  const getOptionsWithCounts = (_category: unknown, options: Array<{ value: string }>) => {
    // Return options unchanged, with zero/blank counts.
    return options.map((o) => ({ ...o, count: 0, displayCount: '' }));
  };

  return {
    // new shape
    total: count,

    // legacy name retained so consumers don’t explode; contains { total }
    filterCounts: { total: count },

    isLoading,
    error,
    formatCount,
    // legacy helpers (no-ops)
    getCount,
    getOptionsWithCounts,
    refreshCounts: () => {
      globalCache.data = null;
      globalCache.timestamp = null;
      fetchCount(currentFilters);
    },
  };
};
