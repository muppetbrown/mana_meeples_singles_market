import { useState, useEffect, useCallback } from 'react';
import { api } from '@/config/api';

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface FilterOptions {
  treatments: FilterOption[];
  rarities: FilterOption[];
  qualities: FilterOption[];
  foilTypes: FilterOption[];
  languages: FilterOption[];
}

interface Game {
  id: number;
  name: string;
  card_count?: number;
}

interface CardSet {
  id: number;
  name: string;
  card_count?: number;
}

/**
 * Custom hook to manage dynamic search filters
 * Fetches and updates available options based on selected filters
 */
export const useSearchFilters = (_apiUrl: string, selectedGame: string = 'all') => {
  const [games, setGames] = useState<Game[]>([]);
  const [sets, setSets] = useState<CardSet[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    treatments: [],
    rarities: [],
    qualities: [],
    foilTypes: [],
    languages: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Game name to ID mapping
   * This should match your database structure
   */
  const getGameIdFromName = useCallback((gameName: string): number | null => {
    const gameMap: Record<string, number> = {
      'Magic: The Gathering': 1,
      'Pokemon': 2,
      'Yu-Gi-Oh!': 3
    };
    return gameMap[gameName] || null;
  }, []);

  /**
   * Fetch available games with card counts
   */
  const fetchGames = useCallback(async () => {
    try {
      const data = await api.get<{ games?: Game[] }>('/games');
      
      // Ensure we have an array to work with
      const gamesArray: Game[] = Array.isArray(data.games) ? data.games :
                        Array.isArray(data) ? data as Game[] : [];

      // Enrich with card counts if available
      const gamesWithCounts = await Promise.all(
        gamesArray.map(async (game) => {
          try {
            const countData = await api.get<{ count: number }>(`/cards/count?game_id=${game.id}`);
            return { ...game, card_count: countData.count || 0 };
          } catch (err) {
            console.warn(`Failed to fetch count for ${game.name}`);
            return { ...game, card_count: 0 };
          }
        })
      );

      setGames(gamesWithCounts);
    } catch (err: any) {
      console.error('Error fetching games:', err);
      setError(err.message);
    }
  }, []);

  /**
   * Fetch sets for selected game
   * Only called when a specific game is selected
   */
  const fetchSets = useCallback(async () => {
    if (selectedGame === 'all') {
      setSets([]);
      return;
    }

    try {
      const gameId = getGameIdFromName(selectedGame);
      if (!gameId) {
        setSets([]);
        return;
      }

      const data = await api.get<CardSet[]>(`/sets?game_id=${gameId}`);
      
      // Ensure we have an array to work with
      const setsArray: CardSet[] = Array.isArray(data) ? data : [];

      // Enrich with card counts
      const setsWithCounts = await Promise.all(
        setsArray.map(async (set) => {
          try {
            const countData = await api.get<{ count: number }>(`/cards/count?set_id=${set.id}`);
            return { ...set, card_count: countData.count || 0 };
          } catch (err) {
            console.warn(`Failed to fetch count for ${set.name}`);
            return { ...set, card_count: 0 };
          }
        })
      );

      setSets(setsWithCounts);
    } catch (err: any) {
      console.error('Error fetching sets:', err);
      setError(err.message);
      setSets([]);
    }
  }, [selectedGame, getGameIdFromName]);

  /**
   * Fetch dynamic filter options based on available data
   */
  const fetchFilterOptions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      if (selectedGame !== 'all') {
        const gameId = getGameIdFromName(selectedGame);
        if (gameId) {
          params.append('game_id', gameId.toString());
        }
      }

      const queryString = params.toString();
      const baseUrl = queryString ? `?${queryString}` : '';

      // Fetch all filter options in parallel
      const [treatments, rarities, qualities, foilTypes, languages] = 
        await Promise.all([
          api.get<FilterOption[]>(`/filters/treatments${baseUrl}`).catch(() => []),
          api.get<FilterOption[]>(`/filters/rarities${baseUrl}`).catch(() => []),
          api.get<FilterOption[]>(`/filters/qualities${baseUrl}`).catch(() => []),
          api.get<FilterOption[]>(`/filters/foil-types${baseUrl}`).catch(() => []),
          api.get<FilterOption[]>(`/filters/languages${baseUrl}`).catch(() => [])
        ]);

      setFilterOptions({
        treatments: treatments || [],
        rarities: rarities || [],
        qualities: qualities || [],
        foilTypes: foilTypes || [],
        languages: languages || []
      });
    } catch (err) {
      console.error('Error fetching filter options:', err);
      // Don't set error state here, just use empty arrays
      setFilterOptions({
        treatments: [],
        rarities: [],
        qualities: [],
        foilTypes: [],
        languages: []
      });
    }
  }, [selectedGame, getGameIdFromName]);

  /**
   * Initialize data on mount
   */
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        await fetchGames();
        await fetchFilterOptions();
      } catch (err: any) {
        console.error('Error loading initial data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [fetchGames, fetchFilterOptions]);

  /**
   * Reload sets when game changes
   */
  useEffect(() => {
    fetchSets();
  }, [fetchSets]);

  /**
   * Reload filter options when game changes
   */
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchGames(),
        fetchSets(),
        fetchFilterOptions()
      ]);
    } catch (err: any) {
      console.error('Error refreshing data:', err);
      setError(err.message);
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
    refresh
  };
};

export default useSearchFilters;