import { useState, useEffect, useRef, useCallback } from 'react';
import { api, buildQueryString } from '@/lib/api';
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

      // STANDARDIZED: Build query params for storefront API
      const params = new URLSearchParams();

      // Search term
      if (searchTerm && searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }

      // Game filter
      if (selectedGame && selectedGame !== 'all') {
        const game = games.find(g => g.name === selectedGame);
        if (game) {
          params.set('game_id', game.id.toString());
        }
      }

      // Set filter
      if (selectedSet && selectedSet !== 'all') {
        const set = sets.find(s => s.name === selectedSet);
        if (set) {
          params.set('set_id', set.id.toString());
        }
      }

      // Treatment filter (server-side)
      if (selectedTreatment && selectedTreatment !== 'all') {
        params.set('treatment', selectedTreatment);
      }

      // Finish filter (server-side)
      if (selectedFinish && selectedFinish !== 'all') {
        params.set('finish', selectedFinish);
      }

      // 🔥 NEW: Check if params actually changed
      const currentParams = params.toString();
      if (currentParams === lastFetchedParams.current) {
        // Same params, skip fetch
        setLoading(false);
        requestInFlight.current = false;
        return;
      }
      
      // Store current params
      lastFetchedParams.current = currentParams;

      // Use the storefront endpoint with trigram search
      const response = await api.get<{ cards: StorefrontCard[] }>(
        `/storefront/cards?${params.toString()}`
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
  
  // 🔥 NEW: Separate effect for debounced search
  useEffect(() => {
    // Clear existing debounce timer
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    // If we have games loaded, debounce the search
    if (games?.length > 0) {
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
        fetchCards();
      }
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