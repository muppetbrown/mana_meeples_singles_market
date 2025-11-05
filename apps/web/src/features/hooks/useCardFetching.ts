import { useState, useEffect, useRef, useCallback } from 'react';
import { api, ENDPOINTS, buildStorefrontQuery } from '@/lib/api';
import { useErrorHandler } from '@/services/error/handler';
import type { StorefrontCard, SearchFilters } from '@/types';

interface Game {
  id: number;
  name: string;
  code?: string;
}

interface Set {
  id: number;
  name: string;
}

// STANDARDIZED: Card fetching params
interface UseCardFetchingParams {
  searchTerm: string;
  selectedGame: string;
  selectedSet: string;
  selectedTreatment: string;
  selectedFinish: string;
  games: Game[];
  sets: Set[];
}

export function useCardFetching({
  searchTerm,
  selectedGame,
  selectedSet,
  selectedTreatment,
  selectedFinish,
  games,
  sets
}: UseCardFetchingParams) {
  const [cards, setCards] = useState<StorefrontCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorHandler = useErrorHandler();
  
  // Track in-flight requests to prevent duplicates
  const requestInFlight = useRef(false);
  
  // 🔥 NEW: Debounce timer for search term only
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  
  // 🔥 NEW: Track last fetched params to prevent unnecessary refetches
  const lastFetchedParams = useRef<string>('');

  const fetchCards = useCallback(async () => {
    // Prevent duplicate requests
    if (requestInFlight.current) return;

    try {
      requestInFlight.current = true;
      setLoading(true);
      setError(null);

      // Use shared query builder to reduce duplication with backend
      const params = buildStorefrontQuery(
        {
          searchTerm,
          selectedGame,
          selectedSet,
          selectedTreatment,
          selectedFinish
        },
        games,
        sets
      );

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

      // Use the storefront endpoint
      const response = await api.get<{ cards: StorefrontCard[] }>(
        `${ENDPOINTS.STOREFRONT.CARDS}?${params.toString()}`
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
      }, 400); // 400ms debounce for search
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