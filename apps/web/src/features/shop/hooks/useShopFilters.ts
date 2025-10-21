import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ENDPOINTS } from '@/lib/api';
import type { SearchFilters } from '@/types';

interface Game {
  id: number;
  name: string;
  code?: string;
  count?: number;
}

interface Set {
  id: number;
  name: string;
  count?: number;
}

interface FilterOptions {
  games: Game[];
  sets: Set[];
  rarities: Array<{ value: string; label: string; count: number }>;
  qualities: Array<{ value: string; label: string; count: number }>;
  foilTypes: Array<{ value: string; label: string; count: number }>;
  treatments: Array<{ value: string; label: string; count: number }>;
}

export function useShopFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    games: [],
    sets: [],
    rarities: [],
    qualities: [],
    foilTypes: [],
    treatments: []
  });

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

  // Load filter options on mount
  useEffect(() => {
    const loadOptions = async () => {
      setIsLoading(true);
      try {
        const options = await api.get<FilterOptions>(ENDPOINTS.STOREFRONT.FILTERS);
        setFilterOptions(options);
      } catch (err: any) {
        setError(err.message || 'Failed to load filters');
        console.error('Filter loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadOptions();
  }, []);

  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        next.delete(key);
        if (value !== undefined && value !== null && value !== '') {
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

  const clearFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const searchCards = useCallback(async (searchTerm?: string) => {
    // This method can be implemented if needed
    // For now, returning empty array
    return [];
  }, []);

  const getFilterOptions = useCallback(async () => {
    return filterOptions;
  }, [filterOptions]);

  return {
    filters,
    updateFilters,
    clearFilters,
    searchCards,
    getFilterOptions,
    isLoading,
    error,
    // Expose these for components that need them directly:
    games: filterOptions.games,
    sets: filterOptions.sets,
    filterOptions,
    loading: isLoading
  };
}