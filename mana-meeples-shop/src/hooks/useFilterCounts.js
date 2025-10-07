import { useState, useEffect, useMemo } from 'react';

/**
 * Hook for managing filter counts
 * Provides real-time counts for filter options
 */
export const useFilterCounts = (API_URL, currentFilters = {}) => {
  const [filterCounts, setFilterCounts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch filter counts from API
  const fetchFilterCounts = async (filters = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();

      // Add current filters (excluding the one being counted)
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`${API_URL}/filters/counts?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // If API endpoint doesn't exist, calculate counts client-side
        throw new Error(`Filter counts API not available: ${response.status}`);
      }

      const data = await response.json();
      setFilterCounts(data);
    } catch (error) {
      console.warn('Filter counts API not available, using fallback:', error.message);
      setError(error.message);

      // Fallback: fetch all cards and calculate counts client-side
      await fetchAndCalculateCounts(filters);
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback: Calculate counts from all cards
  const fetchAndCalculateCounts = async (filters) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('limit', '10000'); // Get all cards for counting

      const response = await fetch(`${API_URL}/cards?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch cards for counting');

      const data = await response.json();
      const counts = calculateFilterCounts(data.cards, filters);
      setFilterCounts(counts);
    } catch (error) {
      console.error('Failed to calculate filter counts:', error);
      setError(error.message);
    }
  };

  // Calculate filter counts from card data
  const calculateFilterCounts = (cards, currentFilters) => {
    const counts = {
      rarities: {},
      qualities: {},
      games: {},
      sets: {},
      foilTypes: {}
    };

    // Filter cards based on current filters (excluding the category being counted)
    const getFilteredCards = (excludeKey) => {
      return cards.filter(card => {
        return Object.entries(currentFilters).every(([key, value]) => {
          if (key === excludeKey || !value || value === 'all') return true;

          switch (key) {
            case 'game':
              return card.game === value;
            case 'rarity':
              return card.rarity === value;
            case 'quality':
              return card.variations?.some(v => v.quality === value);
            case 'set':
              return card.set_name === value;
            case 'foil':
              return card.variations?.some(v =>
                value === 'foil' ? v.foil_type !== 'Non-foil' : v.foil_type === 'Non-foil'
              );
            default:
              return true;
          }
        });
      });
    };

    // Count rarities
    const cardsForRarity = getFilteredCards('rarity');
    cardsForRarity.forEach(card => {
      counts.rarities[card.rarity] = (counts.rarities[card.rarity] || 0) + 1;
    });

    // Count qualities
    const cardsForQuality = getFilteredCards('quality');
    cardsForQuality.forEach(card => {
      card.variations?.forEach(variant => {
        counts.qualities[variant.quality] = (counts.qualities[variant.quality] || 0) + 1;
      });
    });

    // Count games
    const cardsForGame = getFilteredCards('game');
    cardsForGame.forEach(card => {
      counts.games[card.game] = (counts.games[card.game] || 0) + 1;
    });

    // Count sets
    const cardsForSet = getFilteredCards('set');
    cardsForSet.forEach(card => {
      counts.sets[card.set_name] = (counts.sets[card.set_name] || 0) + 1;
    });

    // Count foil types
    const cardsForFoil = getFilteredCards('foil');
    const foilCounts = { foil: 0, 'non-foil': 0 };
    cardsForFoil.forEach(card => {
      card.variations?.forEach(variant => {
        if (variant.foil_type === 'Non-foil') {
          foilCounts['non-foil']++;
        } else {
          foilCounts.foil++;
        }
      });
    });
    counts.foilTypes = foilCounts;

    return counts;
  };

  // Update counts when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchFilterCounts(currentFilters);
    }, 300); // Debounce API calls

    return () => clearTimeout(timeoutId);
  }, [currentFilters, API_URL]);

  // Format count for display
  const formatCount = (count) => {
    if (!count || count === 0) return '';
    if (count < 1000) return `(${count})`;
    if (count < 1000000) return `(${(count / 1000).toFixed(1)}k)`;
    return `(${(count / 1000000).toFixed(1)}M)`;
  };

  // Get count for specific filter option
  const getCount = (category, value) => {
    const categoryData = filterCounts[category];
    if (!categoryData) return '';
    return formatCount(categoryData[value] || 0);
  };

  // Get all options with counts for a category
  const getOptionsWithCounts = (category, options) => {
    const categoryData = filterCounts[category] || {};

    return options.map(option => ({
      ...option,
      count: categoryData[option.value] || 0,
      displayCount: formatCount(categoryData[option.value] || 0)
    })).filter(option => option.count > 0);
  };

  return {
    filterCounts,
    isLoading,
    error,
    getCount,
    getOptionsWithCounts,
    refreshCounts: () => fetchFilterCounts(currentFilters)
  };
};