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
  const requestInFlight = useRef(false);

  const fetchCards = useCallback(async () => {
    // Prevent duplicate requests
    if (requestInFlight.current) return;
    requestInFlight.current = true;

    try {
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

      // Use the storefront endpoint
      const response = await api.get<{ cards: StorefrontCard[] }>(
        `/storefront/cards?${params.toString()}`
      );

      // REMOVED: Client-side treatment filtering - now handled by server
      setCards(response.cards ?? []);
    } catch (err: unknown) {
      console.error('Error fetching cards:', err);
      const message = err instanceof Error ? err.message : 'Failed to load cards';
      setError(message);
      // Use errorHandler directly without it being in dependencies
      errorHandler.handleError(err, { context: 'fetching cards' });
    } finally {
      setLoading(false);
      requestInFlight.current = false;
    }
    // Remove errorHandler from dependency array - it's used but not a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGame, selectedSet, searchTerm, selectedTreatment, selectedFinish, games, sets]);
  
  // Fetch cards when games are loaded or filters change
  useEffect(() => {
    if (games?.length > 0) {
      fetchCards();
    }
  }, [fetchCards, games]);

  return { cards, loading, error, refetch: fetchCards };
}