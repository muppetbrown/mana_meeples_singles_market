import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../config/api';

/**
 * Custom hook to manage dynamic search filters
 * Fetches and updates available options based on selected filters
 * 
 * @param {string} apiUrl - Base API URL
 * @param {string} selectedGame - Currently selected game
 * @returns {Object} Filter state and handlers
 */
export const useSearchFilters = (apiUrl: any, selectedGame = 'all') => {
  const [games, setGames] = useState([]);
  const [sets, setSets] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    treatments: [],
    rarities: [],
    qualities: [],
    foilTypes: [],
    languages: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Game name to ID mapping
   * This should match your database structure
   */
  const getGameIdFromName = useCallback((gameName: any) => {
    const gameMap = {
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
      const data = await api.get<{ games?: any[]; [key: string]: any }>('/games');

      // Ensure we have an array to work with
      const gamesArray = Array.isArray(data.games) ? data.games :
                        Array.isArray(data) ? data : [];

      // Enrich with card counts if available
      const gamesWithCounts = await Promise.all(
        gamesArray.map(async (game: any) => {
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

      const data = await api.get<any[]>(`/sets?game_id=${gameId}`);

      // Ensure we have an array to work with
      const setsArray = Array.isArray(data) ? data : [];

      // Enrich with card counts
      const setsWithCounts = await Promise.all(
        setsArray.map(async (set: any) => {
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
    } catch (err) {
      console.error('Error fetching sets:', err);

      setError(err.message);
      setSets([]);
    }
  }, [apiUrl, selectedGame, getGameIdFromName]);

  /**
   * Fetch dynamic filter options based on available data
   * This should query your materialized view or aggregate data
   */
  const fetchFilterOptions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      if (selectedGame !== 'all') {
        const gameId = getGameIdFromName(selectedGame);
        if (gameId) {
          params.append('game_id', gameId);
        }
      }

      // Fetch available treatments/variations
      const treatmentsRes = await fetch(
        `${apiUrl}/filters/treatments?${params}`,
        { credentials: 'include' }
      );
      
      // Fetch available rarities
      const raritiesRes = await fetch(
        `${apiUrl}/filters/rarities?${params}`,
        { credentials: 'include' }
      );

      // Fetch available qualities
      const qualitiesRes = await fetch(
        `${apiUrl}/filters/qualities?${params}`,
        { credentials: 'include' }
      );

      // Fetch available foil types
      const foilTypesRes = await fetch(
        `${apiUrl}/filters/foil-types?${params}`,
        { credentials: 'include' }
      );

      // Fetch available languages
      const languagesRes = await fetch(
        `${apiUrl}/filters/languages?${params}`,
        { credentials: 'include' }
      );

      const [treatments, rarities, qualities, foilTypes, languages] = 
        await Promise.all([
          treatmentsRes.ok ? treatmentsRes.json() : [],
          raritiesRes.ok ? raritiesRes.json() : [],
          qualitiesRes.ok ? qualitiesRes.json() : [],
          foilTypesRes.ok ? foilTypesRes.json() : [],
          languagesRes.ok ? languagesRes.json() : []
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
  }, [apiUrl, selectedGame, getGameIdFromName]);

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
      } catch (err) {
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
    } catch (err) {
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