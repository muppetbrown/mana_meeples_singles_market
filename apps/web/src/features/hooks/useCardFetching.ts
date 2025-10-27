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

interface UseCardFetchingParams {
  searchTerm: string;
  selectedGame: string;
  selectedSet: string;
  selectedTreatment: string;
  games: Game[];
  sets: Set[];
}

export function useCardFetching({
  searchTerm,
  selectedGame,
  selectedSet,
  selectedTreatment,
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

      const params = new URLSearchParams();

      // Properly resolve game by matching name OR code OR case-insensitive
      if (selectedGame && selectedGame !== 'all') {
        const game = games.find(g =>
          g.name === selectedGame ||
          g.code === selectedGame ||
          g.name.toLowerCase() === selectedGame.toLowerCase()
        );

        if (game?.id) {
          params.append('game_id', String(game.id));
        }
      }

      // Properly resolve set by matching name
      if (selectedSet && selectedSet !== 'all') {
        const set = sets.find(s => s.name === selectedSet);
        if (set?.id) {
          params.append('set_id', String(set.id));
        }
      }

      // Add search term
      if (searchTerm && searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      // Add pagination
      params.append('page', '1');
      params.append('per_page', '100');
      params.append('sort', 'name');
      params.append('order', 'asc');

      // Use the storefront endpoint
      const response = await api.get<{ cards: StorefrontCard[] }>(
        `/storefront/cards?${params.toString()}`
      );

      let fetchedCards = response.cards ?? [];

      // Apply client-side treatment filtering
      if (selectedTreatment && selectedTreatment !== 'all') {
        fetchedCards = fetchedCards.filter(card => {
          const cardTreatment = 'treatment' in card && typeof card.treatment === 'string' ? card.treatment : 'STANDARD';
          return cardTreatment === selectedTreatment;
        });
      }

      setCards(fetchedCards);
    } catch (err: unknown) {
      console.error('Error fetching cards:', err);
      const message = err instanceof Error ? err.message : 'Failed to load cards';
      setError(message);
      errorHandler.handleError(err, { context: 'fetching cards' });
    } finally {
      setLoading(false);
      requestInFlight.current = false;
    }
  }, [selectedGame, selectedSet, searchTerm, selectedTreatment, games, sets, errorHandler]);

  // Fetch cards when games are loaded or filters change
  useEffect(() => {
    if (games?.length > 0) {
      fetchCards();
    }
  }, [fetchCards, games]);

  return { cards, loading, error, refetch: fetchCards };
}