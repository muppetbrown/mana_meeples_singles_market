// ============================================================================
// features/shop/hooks/useShopFilters.ts - Shop filter management
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SearchFilters, StorefrontCard } from '@/types';
import { api, ENDPOINTS } from '@/lib/api';

/**
 * Shop filters and search management
 * Syncs with URL params and manages filter state
 */
export function useShopFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Parse filters from URL
  const filters: SearchFilters = useMemo(() => ({
    game: searchParams.get('game') || undefined,
    set: searchParams.get('set') || undefined,
    rarity: searchParams.getAll('rarity'),
    quality: searchParams.getAll('quality'),
    foilType: searchParams.getAll('foilType'),
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    inStockOnly: searchParams.get('inStockOnly') === 'true'
  }), [searchParams]);

  /**
   * Update filters (syncs to URL)
   */
  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);

      Object.entries(updates).forEach(([key, value]) => {
        // Remove existing values
        next.delete(key);

        // Add new values
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => next.append(key, String(v)));
          } else {
            next.set(key, String(value));
          }
        }
      });

      return next;
    });
  }, [setSearchParams]);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  /**
   * Search cards with current filters
   */
  const searchCards = useCallback(async (searchTerm?: string) => {
    setIsLoading(true);
    try {
      const params = {
        ...filters,
        search: searchTerm
      };

      const cards = await api.get<StorefrontCard[]>(
        ENDPOINTS.STOREFRONT.CARDS,
        params
      );

      return cards;
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  /**
   * Get available filter options
   */
  const getFilterOptions = useCallback(async () => {
    return api.get(ENDPOINTS.STOREFRONT.FILTERS);
  }, []);

  return {
    filters,
    updateFilters,
    clearFilters,
    searchCards,
    getFilterOptions,
    isLoading
  };
}