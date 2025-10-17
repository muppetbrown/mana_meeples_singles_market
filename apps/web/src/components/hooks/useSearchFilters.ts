import { useState, useEffect, useCallback } from 'react';

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
      const response = await fetch(`${apiUrl}/games`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch games');
      }
      
      const data = await response.json();
      
      // Enrich with card counts if available
      const gamesWithCounts = await Promise.all(
        (data.games || data).map(async (game: any) => {
          try {
            const countRes = await fetch(
              `${apiUrl}/cards/count?game_id=${game.id}`,
              { credentials: 'include' }
            );
            
            if (countRes.ok) {
              const countData = await countRes.json();
              return { ...game, card_count: countData.count || 0 };
            }
          } catch (err) {
            console.warn(`Failed to fetch count for ${game.name}`);
          }
          return { ...game, card_count: 0 };
        })
      );
      

      setGames(gamesWithCounts);
    } catch (err) {
      console.error('Error fetching games:', err);

      setError(err.message);
    }
  }, [apiUrl]);

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

      const response = await fetch(`${apiUrl}/sets?game_id=${gameId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sets');
      }

      const data = await response.json();
      
      // Enrich with card counts
      const setsWithCounts = await Promise.all(
        data.map(async (set: any) => {
          try {
            const countRes = await fetch(
              `${apiUrl}/cards/count?set_id=${set.id}`,
              { credentials: 'include' }
            );
            
            if (countRes.ok) {
              const countData = await countRes.json();
              return { ...set, card_count: countData.count || 0 };
            }
          } catch (err) {
            console.warn(`Failed to fetch count for ${set.name}`);
          }
          return { ...set, card_count: 0 };
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