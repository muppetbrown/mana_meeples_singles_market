import { useState, useEffect, useRef, useCallback } from 'react';
import { api, ENDPOINTS, buildCardQuery, type CardQueryParams, type Game, type Set } from '@/lib/api';
import { useErrorHandler } from '@/services/error/handler';
import { FILTER_CONFIG } from '@/lib/constants';
import type { StorefrontCard, SearchFilters } from '@/types';

// UNIFIED: Card fetching params using shared types
export interface UseCardFetchingParams {
  searchTerm: string;
  selectedGame: string;
  selectedSet: string;
  selectedTreatment: string;
  selectedFinish: string;
  selectedRarity?: string;
  selectedQuality?: string;
  games: Game[];
  sets: Set[];
  mode?: 'storefront' | 'admin';  // Endpoint mode
  hasInventory?: boolean;          // Admin filter: only cards with inventory
  limit?: number;                  // Admin: max results
}

export function useCardFetching({
  searchTerm,
  selectedGame,
  selectedSet,
  selectedTreatment,
  selectedFinish,
  selectedRarity,
  selectedQuality,
  games,
  sets,
  mode = 'storefront',
  hasInventory,
  limit
}: UseCardFetchingParams) {
  const [cards, setCards] = useState<StorefrontCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorHandler = useErrorHandler();

  // Track in-flight requests to prevent duplicates
  const requestInFlight = useRef(false);

  // Debounce timer for search term only
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Track last fetched params to prevent unnecessary refetches
  const lastFetchedParams = useRef<string>('');

  const fetchCards = useCallback(async () => {
    // Prevent duplicate requests
    if (requestInFlight.current) return;

    try {
      requestInFlight.current = true;
      setLoading(true);
      setError(null);

      // UNIFIED: Use shared query builder for both admin and storefront
      const queryParams: CardQueryParams = {
        searchTerm,
        selectedGame,
        selectedSet,
        selectedTreatment,
        selectedFinish,
        selectedRarity,
        selectedQuality,
        hasInventory,
        limit
      };

      const params = buildCardQuery(queryParams, games, sets);

      // Check if params actually changed
      const currentParams = params.toString();
      if (currentParams === lastFetchedParams.current) {
        // Same params, skip fetch
        setLoading(false);
        requestInFlight.current = false;
        return;
      }

      // Store current params
      lastFetchedParams.current = currentParams;

      // Choose endpoint based on mode
      const endpoint = mode === 'admin'
        ? ENDPOINTS.CARDS.LIST
        : ENDPOINTS.STOREFRONT.CARDS;

      const response = await api.get<{ cards: StorefrontCard[] }>(
        `${endpoint}?${params.toString()}`
      );

      setCards(response.cards ?? []);
    } catch (err: unknown) {
      console.error('Error fetching cards:', err);
      const message = err instanceof Error ? err.message : 'Failed to load cards';
      setError(message);
      errorHandler.handleError(err, { context: 'fetching cards' });
    } finally {
      setLoading(false);
      requestInFlight.current = false;
    }
  }, [
    selectedGame,
    selectedSet,
    searchTerm,
    selectedTreatment,
    selectedFinish,
    selectedRarity,
    selectedQuality,
    hasInventory,
    limit,
    mode,
    games,
    sets,
    errorHandler
  ]);
  
  // Fetch cards with debouncing for search
  useEffect(() => {
    // Clear existing debounce timer
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    // For search term changes, debounce for 400ms
    // For other filter changes, fetch immediately
    const isSearchChange = searchTerm.length > 0;

    if (isSearchChange) {
      // Debounce search term changes
      searchDebounceTimer.current = setTimeout(() => {
        fetchCards();
      }, FILTER_CONFIG.DEBOUNCE_DELAY); // Use consistent debounce delay
    } else {
      // Immediate fetch for filter changes or empty search
      // This allows initial load to work even if games aren't loaded yet
      fetchCards();
    }

    // Cleanup on unmount
    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, [
    searchTerm,
    selectedGame,
    selectedSet,
    selectedTreatment,
    selectedFinish,
    games,
    fetchCards
  ]);

  return { cards, loading, error, refetch: fetchCards };
}