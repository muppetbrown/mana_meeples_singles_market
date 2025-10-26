// apps/web/src/components/FiltersPanel.tsx
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

type FilterOption = {
  type: 'treatment' | 'quality' | 'foilType' | 'language';
  value: string;
  label: string;
};

type FiltersResponse = {
  treatments: string[];
  languages: string[];
  qualities: string[];
  foilTypes: string[];
  priceMin: number | null;
  priceMax: number | null;
  inStockCount: number;
};

export default function FiltersPanel() {
  const [filterOptions, setFilterOptions] = useState<FilterOption[]>([]);
  const [priceRange, setPriceRange] = useState<{ min: number | null; max: number | null }>({
    min: null,
    max: null,
  });
  const [inStockCount, setInStockCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const announceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchFilters = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await api.get<FiltersResponse>('/cards/filters');
        
        // Transform the flat arrays into labeled filter options
        const options: FilterOption[] = [
          ...(response.treatments?.map(t => ({
            type: 'treatment' as const,
            value: t,
            label: formatLabel(t)
          })) ?? []),
          ...(response.qualities?.map(q => ({
            type: 'quality' as const,
            value: q,
            label: q
          })) ?? []),
          ...(response.foilTypes?.map(f => ({
            type: 'foilType' as const,
            value: f,
            label: f
          })) ?? []),
          ...(response.languages?.map(l => ({
            type: 'language' as const,
            value: l,
            label: l
          })) ?? []),
        ];
        
        setFilterOptions(options);
        setPriceRange({
          min: response.priceMin,
          max: response.priceMax,
        });
        setInStockCount(response.inStockCount ?? 0);
      } catch (error) {
        console.error('Failed to fetch filters:', error);
        setError('Failed to load filters');
        setFilterOptions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilters();
  }, []);

  // Helper to format treatment names nicely
  const formatLabel = (value: string): string => {
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Update screen reader announcement
  useEffect(() => {
    if (announceRef.current && !isLoading) {
      announceRef.current.textContent = error
        ? error
        : `Loaded ${filterOptions.length} filter options. ${inStockCount} cards in stock.`;
    }
  }, [filterOptions.length, isLoading, error, inStockCount]);

  // Group filters by type for better display
  const filtersByType = {
    treatments: filterOptions.filter(f => f.type === 'treatment'),
    qualities: filterOptions.filter(f => f.type === 'quality'),
    foilTypes: filterOptions.filter(f => f.type === 'foilType'),
    languages: filterOptions.filter(f => f.type === 'language'),
  };

  if (isLoading) {
    return (
      <aside aria-labelledby="filters-heading" className="p-3 border rounded-2xl bg-white">
        <h2 id="filters-heading" className="text-lg font-semibold text-slate-900">
          Filters
        </h2>
        <div className="mt-4 space-y-2">
          <div className="h-4 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-slate-200 rounded animate-pulse w-1/2" />
        </div>
      </aside>
    );
  }

  if (error) {
    return (
      <aside aria-labelledby="filters-heading" className="p-3 border rounded-2xl bg-red-50 border-red-200">
        <h2 id="filters-heading" className="text-lg font-semibold text-red-900">
          Filters
        </h2>
        <p className="text-sm text-red-700 mt-2">{error}</p>
      </aside>
    );
  }

  return (
    <aside aria-labelledby="filters-heading" className="p-3 border rounded-2xl bg-white">
      <h2 id="filters-heading" className="text-lg font-semibold text-slate-900">
        Available Filters
      </h2>
      
      <div aria-live="polite" aria-atomic="true" className="sr-only" ref={announceRef} />

      {/* Stock Summary */}
      {inStockCount > 0 && (
        <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-sm font-medium text-emerald-700">
            {inStockCount} cards in stock
          </p>
        </div>
      )}

      {/* Price Range */}
      {(priceRange.min !== null || priceRange.max !== null) && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">
            Price Range
          </p>
          <p className="text-sm text-blue-700">
            {priceRange.min !== null && `$${priceRange.min.toFixed(2)}`}
            {priceRange.min !== null && priceRange.max !== null && ' - '}
            {priceRange.max !== null && `$${priceRange.max.toFixed(2)}`}
          </p>
        </div>
      )}

      {/* Filter Groups */}
      <div className="mt-4 space-y-4">
        {/* Treatments */}
        {filtersByType.treatments.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
              Treatments ({filtersByType.treatments.length})
            </h3>
            <ul className="space-y-1">
              {filtersByType.treatments.slice(0, 5).map((filter) => (
                <li key={filter.value} className="text-sm text-slate-600">
                  <span className="inline-block w-2 h-2 rounded-full bg-purple-400 mr-2" aria-hidden="true" />
                  {filter.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Qualities */}
        {filtersByType.qualities.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
              Qualities ({filtersByType.qualities.length})
            </h3>
            <ul className="space-y-1">
              {filtersByType.qualities.map((filter) => (
                <li key={filter.value} className="text-sm text-slate-600">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2" aria-hidden="true" />
                  {filter.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Foil Types */}
        {filtersByType.foilTypes.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
              Foil Types ({filtersByType.foilTypes.length})
            </h3>
            <ul className="space-y-1">
              {filtersByType.foilTypes.map((filter) => (
                <li key={filter.value} className="text-sm text-slate-600">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-2" aria-hidden="true" />
                  {filter.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Languages */}
        {filtersByType.languages.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
              Languages ({filtersByType.languages.length})
            </h3>
            <ul className="space-y-1">
              {filtersByType.languages.slice(0, 5).map((filter) => (
                <li key={filter.value} className="text-sm text-slate-600">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2" aria-hidden="true" />
                  {filter.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Empty State */}
      {filterOptions.length === 0 && (
        <p className="text-sm text-slate-500 mt-4 italic">
          No filters available
        </p>
      )}
    </aside>
  );
}