// apps/web/src/components/VariationFilter.tsx
import { useState, useEffect } from 'react';
import { api, buildQueryString } from '@/lib/api';
import { variationFilterCache } from './VariationFilterCache';

type VariationFiltersResponse = {
  treatments?: string[];
  borderColors?: string[];
  finishes?: string[];
  promoTypes?: string[];
  frameEffects?: string[];
};

type AvailableFilters = {
  treatments: string[];
  borderColors: string[];
  finishes: string[];
  promoTypes: string[];
  frameEffects: string[];
};

/**
 * Dynamic Variation Filter Component
 * 
 * Automatically updates available filter options based on selected game/set
 * Only shows variations that actually exist in the current context
 */
const VariationFilter = ({
  selectedGame,
  selectedSet,
  filters,
  onFilterChange,
}: {
  selectedGame?: string | number | undefined;
  selectedSet?: string | number | undefined;
  filters: {
    treatment?: string;
    borderColor?: string;
    finish?: string;
    promoType?: string;
    frameEffect?: string;
  };
  onFilterChange: (filterName: string, value: string) => void;
}) => {
  const [availableFilters, setAvailableFilters] = useState<AvailableFilters>({
    treatments: [],
    borderColors: [],
    finishes: [],
    promoTypes: [],
    frameEffects: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available filters when game or set changes
  useEffect(() => {
    const fetchAvailableFilters = async () => {
      setLoading(true);
      setError(null);

      try {
        const queryParams: Record<string, string | number> = {};

        // Priority: set_id over game_id
        if (selectedSet && selectedSet !== 'all') {
          queryParams.set_id = selectedSet;
        } else if (selectedGame && selectedGame !== 'all') {
          queryParams.game_id = selectedGame;
        }

        // If no filters selected, don't fetch (would return all variations)
        if (Object.keys(queryParams).length === 0) {
          setAvailableFilters({
            treatments: [],
            borderColors: [],
            finishes: [],
            promoTypes: [],
            frameEffects: []
          });
          setLoading(false);
          return;
        }

        // Check cache first
        const cachedData = variationFilterCache.get(queryParams);
        if (cachedData) {
          setAvailableFilters({
            treatments: cachedData.treatments ?? [],
            borderColors: cachedData.borderColors ?? [],
            finishes: cachedData.finishes ?? [],
            promoTypes: cachedData.promoTypes ?? [],
            frameEffects: cachedData.frameEffects ?? []
          });
          setLoading(false);
          return;
        }

        // Fetch from API and cache result
        const data = await api.get<VariationFiltersResponse>(`/variations${buildQueryString(queryParams)}`);

        // Store in cache
        variationFilterCache.set(queryParams, data);

        setAvailableFilters({
          treatments: data.treatments ?? [],
          borderColors: data.borderColors ?? [],
          finishes: data.finishes ?? [],
          promoTypes: data.promoTypes ?? [],
          frameEffects: data.frameEffects ?? []
        });
      } catch (err) {
        console.error('Error fetching variation filters:', err);
        setError('Failed to load filters');
        setAvailableFilters({
          treatments: [],
          borderColors: [],
          finishes: [],
          promoTypes: [],
          frameEffects: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableFilters();
  }, [selectedGame, selectedSet]);

  // Helper to format labels
  const formatLabel = (value: string): string => {
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 rounded w-1/4" />
          <div className="h-8 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  // Don't render if no filters available
  const hasFilters = 
    availableFilters.treatments.length > 0 ||
    availableFilters.borderColors.length > 0 ||
    availableFilters.finishes.length > 0 ||
    availableFilters.promoTypes.length > 0 ||
    availableFilters.frameEffects.length > 0;

  if (!hasFilters) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Treatments */}
      {availableFilters.treatments.length > 0 && (
        <div>
          <label htmlFor="treatment-filter" className="block text-sm font-medium text-slate-700 mb-2">
            Treatment
          </label>
          <select
            id="treatment-filter"
            value={filters.treatment || 'all'}
            onChange={(e) => onFilterChange('treatment', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Treatments</option>
            {availableFilters.treatments.map((treatment) => (
              <option key={treatment} value={treatment}>
                {formatLabel(treatment)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Border Colors */}
      {availableFilters.borderColors.length > 0 && (
        <div>
          <label htmlFor="border-filter" className="block text-sm font-medium text-slate-700 mb-2">
            Border Color
          </label>
          <select
            id="border-filter"
            value={filters.borderColor || 'all'}
            onChange={(e) => onFilterChange('borderColor', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Borders</option>
            {availableFilters.borderColors.map((color) => (
              <option key={color} value={color}>
                {formatLabel(color)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Finishes */}
      {availableFilters.finishes.length > 0 && (
        <div>
          <label htmlFor="finish-filter" className="block text-sm font-medium text-slate-700 mb-2">
            Finish
          </label>
          <select
            id="finish-filter"
            value={filters.finish || 'all'}
            onChange={(e) => onFilterChange('finish', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Finishes</option>
            {availableFilters.finishes.map((finish) => (
              <option key={finish} value={finish}>
                {formatLabel(finish)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Promo Types */}
      {availableFilters.promoTypes.length > 0 && (
        <div>
          <label htmlFor="promo-filter" className="block text-sm font-medium text-slate-700 mb-2">
            Promo Type
          </label>
          <select
            id="promo-filter"
            value={filters.promoType || 'all'}
            onChange={(e) => onFilterChange('promoType', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Promos</option>
            {availableFilters.promoTypes.map((promo) => (
              <option key={promo} value={promo}>
                {formatLabel(promo)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Frame Effects */}
      {availableFilters.frameEffects.length > 0 && (
        <div>
          <label htmlFor="frame-filter" className="block text-sm font-medium text-slate-700 mb-2">
            Frame Effect
          </label>
          <select
            id="frame-filter"
            value={filters.frameEffect || 'all'}
            onChange={(e) => onFilterChange('frameEffect', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Frames</option>
            {availableFilters.frameEffects.map((effect) => (
              <option key={effect} value={effect}>
                {formatLabel(effect)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default VariationFilter;