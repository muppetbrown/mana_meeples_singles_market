// apps/web/src/hooks/useSearchFilters.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/config/api';

interface FilterOption {
  value: string;
  label: string;
  count: number; // counts not provided by /cards/filters; we default to 0 for now
}

interface FilterOptions {
  treatments: FilterOption[];
  rarities: FilterOption[];   // backend doesn’t return these yet → empty
  qualities: FilterOption[];
  foilTypes: FilterOption[];
  languages: FilterOption[];
}

interface Game {
  id: number;
  name: string;
  code?: string;       // important for /cards/filters?game=<code>
  card_count?: number; // we’ll enrich from /cards/count
}

interface CardSet {
  id: number;
  name: string;
  card_count?: number; // we’ll enrich from /cards/count
}

/**
 * Fetches: games, sets (for selected game), and facet options.
 * Facets come from /cards/filters which returns arrays (no per-option counts).
 * We keep the FilterOption shape by assigning count=0 and label=value.
 */
export const useSearchFilters = (_deprecatedApiUrlParam: unknown, selectedGame: string = 'all') => {
  const [games, setGames] = useState<Game[]>([]);
  const [sets, setSets] = useState<CardSet[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    treatments: [],
    rarities: [],
    qualities: [],
    foilTypes: [],
    languages: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve selected game's id/code from current games list (no hard-coded map)
  const selectedGameRef = useMemo(() => {
    if (selectedGame === 'all') return { id: null as number | null, code: null as string | null };
    const found = games.find(g => g.name === selectedGame || g.code === selectedGame);
    return { id: found?.id ?? null, code: found?.code ?? null };
  }, [games, selectedGame]);

  // --- Fetch games (and enrich with card counts) ---
  const fetchGames = useCallback(async () => {
    try {
      const data = await api.get<{ games?: Game[] }>('/games');
      const list: Game[] = Array.isArray(data?.games) ? data.games : [];

      // Enrich each game with count; failures default to 0 (don’t block UI)
      const enriched = await Promise.all(
        list.map(async (g) => {
          try {
            const { count } = await api.get<{ count: number }>(`/cards/count?game_id=${g.id}`);
            return { ...g, card_count: typeof count === 'number' ? count : 0 };
          } catch {
            return { ...g, card_count: 0 };
          }
        })
      );

      setGames(enriched);
    } catch (err: any) {
      console.error('Error fetching games:', err);
      setGames([]);
      setError(err?.message ?? 'Failed to fetch games');
    }
  }, []);

  // --- Fetch sets for selected game ---
  const fetchSets = useCallback(async () => {
    if (selectedGame === 'all') {
      setSets([]);
      return;
    }
    const gameId = selectedGameRef.id;
    if (!gameId) {
      setSets([]);
      return;
    }
    try {
      const list = await api.get<CardSet[]>(`/sets?game_id=${gameId}`);
      const setsArray: CardSet[] = Array.isArray(list) ? list : [];

      const enriched = await Promise.all(
        setsArray.map(async (s) => {
          try {
            const { count } = await api.get<{ count: number }>(`/cards/count?set_id=${s.id}`);
            return { ...s, card_count: typeof count === 'number' ? count : 0 };
          } catch {
            return { ...s, card_count: 0 };
          }
        })
      );

      setSets(enriched);
    } catch (err: any) {
      console.error('Error fetching sets:', err);
      setSets([]);
      setError(err?.message ?? 'Failed to fetch sets');
    }
  }, [selectedGame, selectedGameRef.id]);

  // --- Fetch facet options (treatments, languages, qualities, foil types) ---
  const fetchFilterOptions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      // /cards/filters accepts { game: code, set_id }
      if (selectedGameRef.code) params.set('game', selectedGameRef.code);

      const facets = await api.get<{
        treatments?: string[];
        languages?: string[];
        qualities?: string[];
        foilTypes?: string[];
        finishes?: string[];      // not used here, but available if needed later
        borderColors?: string[];  // same
        promoTypes?: string[];    // same
        frameEffects?: string[];  // same
        inStockCount?: number;    // aggregate; not used here
        priceMin?: number | null; // not used here
        priceMax?: number | null; // not used here
      }>(`/cards/filters?${params.toString()}`);

      const toOptions = (arr?: string[]): FilterOption[] =>
        Array.isArray(arr)
          ? Array.from(new Set(arr.filter(Boolean))).map(v => ({
              value: v!,
              label: v!,
              count: 0, // counts aren’t provided by /cards/filters
            }))
          : [];

      setFilterOptions({
        treatments: toOptions(facets?.treatments),
        rarities: [], // backend doesn’t return per-rarity facets yet
        qualities: toOptions(facets?.qualities),
        foilTypes: toOptions(facets?.foilTypes),
        languages: toOptions(facets?.languages),
      });
    } catch (err) {
      console.error('Error fetching filter options:', err);
      // Don’t surface as fatal; supply empty options to keep UI usable
      setFilterOptions({
        treatments: [],
        rarities: [],
        qualities: [],
        foilTypes: [],
        languages: [],
      });
    }
  }, [selectedGameRef.code]);

  // --- Initial load ---
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchGames();
        await fetchFilterOptions();
      } catch (err: any) {
        if (mounted) setError(err?.message ?? 'Failed to load filters');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fetchGames, fetchFilterOptions]);

  // --- React to game changes ---
  useEffect(() => {
    fetchSets();
  }, [fetchSets]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchGames(), fetchSets(), fetchFilterOptions()]);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to refresh filters');
    } finally {
      setLoading(false);
    }
  }, [fetchGames, fetchSets, fetchFilterOptions]);

  return {
    games,
    sets,
    filterOptions,
    loading,
    error,
    refresh,
  };
};

export default useSearchFilters;
