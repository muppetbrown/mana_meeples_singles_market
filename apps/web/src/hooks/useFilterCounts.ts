import { useState, useEffect, useRef, useCallback } from 'react';
import { FILTER_CONFIG } from '../config/constants';

// Global cache to persist across component remounts
const globalCache = {
  data: null,
  timestamp: null,
  filters: null
};

const CACHE_DURATION = FILTER_CONFIG.CACHE_DURATION;
const DEBOUNCE_DELAY = FILTER_CONFIG.DEBOUNCE_DELAY;
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000; // 2 seconds between retries

//const MIN_SEARCH_LENGTH = FILTER_CONFIG.MIN_SEARCH_LENGTH: 2, // Minimum characters to trigger search
//const MAX_SUGGESTIONS = FILTER_CONFIG.MAX_SUGGESTIONS: 10, // Maximum autocomplete suggestions

/**
 * Hook for managing filter counts with aggressive caching and rate limit protection
 */
export const useFilterCounts = (API_URL: any, currentFilters = {}) => {
  const [filterCounts, setFilterCounts] = useState(globalCache.data || {});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastFetchRef = useRef(0);

  // Check if cached data is still valid
  const isCacheValid = useCallback(() => {
    if (!globalCache.data || !globalCache.timestamp) return false;

    const cacheAge = Date.now() - globalCache.timestamp;

    // Optimized filters comparison - avoid expensive JSON.stringify
    const cachedFilters = globalCache.filters || {};
    const filtersMatch = Object.keys(currentFilters).length === Object.keys(cachedFilters).length &&

      Object.entries(currentFilters).every(([key, value]) => cachedFilters[key] === value);

    return cacheAge < CACHE_DURATION && filtersMatch;
  }, [currentFilters]);

  // Fetch filter counts with retry logic

  const fetchFilterCounts = useCallback(async (filters = {}, retryCount = 0) => {
    // Rate limiting: prevent requests within 1 second of last request
    const now = Date.now();
    if (now - lastFetchRef.current < 1000) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Rate limiting: skipping request');
      }
      return;
    }
    lastFetchRef.current = now;

    // Abort previous request if still pending
    if (abortControllerRef.current) {

      abortControllerRef.current.abort();
    }


    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();

      // Add current filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {

          queryParams.append(key, String(value));
        }
      });

      const response = await fetch(`${API_URL}/filters/counts?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },

        signal: abortControllerRef.current.signal
      });

      if (response.status === 429) {
        // Rate limited - don't retry immediately, use cached data
        if (retryCount < MAX_RETRIES) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Rate limited, retry ${retryCount + 1}/${MAX_RETRIES} in ${RETRY_DELAY}ms`);
          }
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retryCount)));
          return fetchFilterCounts(filters, retryCount + 1);
        } else {
          throw new Error('Rate limit exceeded. Using cached data.');
        }
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Update global cache
      globalCache.data = data;

      globalCache.timestamp = Date.now();

      globalCache.filters = filters;
      
      setFilterCounts(data);
      setError(null);
    } catch (error) {

      if (error.name === 'AbortError') {
        if (process.env.NODE_ENV === 'development') {
          console.log('Request aborted');
        }
        return;
      }

      if (process.env.NODE_ENV === 'development') {

        console.error('Filter counts error:', error.message);
      }

      setError(error.message);
      
      // Use cached data if available, don't fall back to fetching all cards
      if (globalCache.data) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Using cached filter counts');
        }
        setFilterCounts(globalCache.data);
      } else {
        // Only show empty counts on first load failure
        setFilterCounts({
          rarities: {},
          qualities: {},
          games: {},
          sets: {},
          foilTypes: {}
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  // Update counts when filters change with debouncing
  useEffect(() => {
    // Check cache first
    if (isCacheValid()) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Using valid cached filter counts');
      }

      setFilterCounts(globalCache.data);
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the API call

    debounceTimerRef.current = setTimeout(() => {
      fetchFilterCounts(currentFilters);
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {

        abortControllerRef.current.abort();
      }
    };
  }, [currentFilters, fetchFilterCounts, isCacheValid]);

  // Format count for display
  const formatCount = (count: any) => {
    if (!count || count === 0) return '';
    if (count < 1000) return `(${count})`;
    if (count < 1000000) return `(${(count / 1000).toFixed(1)}k)`;
    return `(${(count / 1000000).toFixed(1)}M)`;
  };

  // Get count for specific filter option
  const getCount = (category: any, value: any) => {

    const categoryData = filterCounts[category];
    if (!categoryData) return '';
    return formatCount(categoryData[value] || 0);
  };

  // Get all options with counts for a category
  const getOptionsWithCounts = (category: any, options: any) => {

    const categoryData = filterCounts[category] || {};

    return options.map((option: any) => ({
      ...option,
      count: categoryData[option.value] || 0,
      displayCount: formatCount(categoryData[option.value] || 0)
    })).filter((option: any) => option.count > 0);
  };

  return {
    filterCounts,
    isLoading,
    error,
    getCount,
    getOptionsWithCounts,
    refreshCounts: () => {
      // Clear cache on manual refresh
      globalCache.data = null;
      globalCache.timestamp = null;
      fetchFilterCounts(currentFilters);
    }
  };
};