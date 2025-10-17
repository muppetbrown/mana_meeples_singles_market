import React, { useState, useEffect } from 'react';

/**
 * Dynamic Variation Filter Component
 * 
 * Automatically updates available filter options based on selected game/set
 * Only shows variations that actually exist in the current context
 */
const DynamicVariationFilter = ({
  selectedGame,
  selectedSet,
  filters,
  onFilterChange,
  apiUrl = '/api'
}: any) => {
  const [availableFilters, setAvailableFilters] = useState({
    treatments: [],
    borderColors: [],
    finishes: [],
    promoTypes: [],
    frameEffects: []
  });
  
  const [loading, setLoading] = useState(false);
  const [filterContext, setFilterContext] = useState(null);

  // Fetch available filters when game or set changes
  useEffect(() => {
    const fetchAvailableFilters = async () => {
      setLoading(true);
      
      try {
        const params = new URLSearchParams();
        
        if (selectedSet && selectedSet !== 'all') {
          params.append('set_id', selectedSet);
        } else if (selectedGame && selectedGame !== 'all') {
          params.append('game_id', selectedGame);
        }
        
        const response = await fetch(`${apiUrl}/variations/filters?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch filters');
        }
        
        const data = await response.json();
        
        setAvailableFilters({
          treatments: data.treatments || [],
          borderColors: data.borderColors || [],
          finishes: data.finishes || [],
          promoTypes: data.promoTypes || [],
          frameEffects: data.frameEffects || []
        });
        
        setFilterContext(data.context);
        
      } catch (error) {
        console.error('Error fetching variation filters:', error);
        // Keep existing filters on error
      } finally {
        setLoading(false);
      }
    };
    
    fetchAvailableFilters();
  }, [selectedGame, selectedSet, apiUrl]);

  // Format treatment name for display
  const formatTreatment = (treatment: any) => {
    if (!treatment) return 'Standard';
    
    // Convert UPPERCASE_SNAKE_CASE to Title Case
    return treatment
      .split('_')
      .map((word: any) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Group treatments by category for better UX
  const groupTreatments = (treatments: any) => {
    const groups = {
      standard: [],
      borderless: [],
      showcase: [],
      extended: [],
      fullart: [],
      special: []
    };
    
    treatments.forEach((treatment: any) => {
      const lower = treatment.toLowerCase();
      
      if (lower === 'standard') {

        groups.standard.push(treatment);
      } else if (lower.includes('borderless')) {

        groups.borderless.push(treatment);
      } else if (lower.includes('showcase')) {

        groups.showcase.push(treatment);
      } else if (lower.includes('extended')) {

        groups.extended.push(treatment);
      } else if (lower.includes('fullart')) {

        groups.fullart.push(treatment);
      } else {

        groups.special.push(treatment);
      }
    });
    
    return groups;
  };

  const treatmentGroups = groupTreatments(availableFilters.treatments);

  return (
    <div className="space-y-6">
      {/* Context Indicator */}
      {filterContext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Showing variations for:</strong>{' '}
            // @ts-expect-error TS(2339): Property 'scope' does not exist on type 'never'.
            {filterContext.scope === 'set' && 'Selected Set'}
            // @ts-expect-error TS(2339): Property 'scope' does not exist on type 'never'.
            {filterContext.scope === 'game' && 'Selected Game'}
            // @ts-expect-error TS(2339): Property 'scope' does not exist on type 'never'.
            {filterContext.scope === 'all' && 'All Games'}
          </p>
        </div>
      )}

      {/* Treatment Filter */}
      {availableFilters.treatments.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Treatment Type
          </label>
          <select
            value={filters.treatment || 'all'}
            onChange={(e) => onFilterChange('treatment', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
            <option value="all">All Treatments</option>
            
            {/* Standard */}
            {treatmentGroups.standard.length > 0 && (
              <optgroup label="🔲 Standard">
                {treatmentGroups.standard.map(treatment => (
                  <option key={treatment} value={treatment}>
                    {formatTreatment(treatment)}
                  </option>
                ))}
              </optgroup>
            )}
            
            {/* Borderless */}
            {treatmentGroups.borderless.length > 0 && (
              <optgroup label="🖼️ Borderless">
                {treatmentGroups.borderless.map(treatment => (
                  <option key={treatment} value={treatment}>
                    {formatTreatment(treatment)}
                  </option>
                ))}
              </optgroup>
            )}
            
            {/* Showcase */}
            {treatmentGroups.showcase.length > 0 && (
              <optgroup label="⭐ Showcase">
                {treatmentGroups.showcase.map(treatment => (
                  <option key={treatment} value={treatment}>
                    {formatTreatment(treatment)}
                  </option>
                ))}
              </optgroup>
            )}
            
            {/* Extended Art */}
            {treatmentGroups.extended.length > 0 && (
              <optgroup label="🎨 Extended Art">
                {treatmentGroups.extended.map(treatment => (
                  <option key={treatment} value={treatment}>
                    {formatTreatment(treatment)}
                  </option>
                ))}
              </optgroup>
            )}
            
            {/* Full Art */}
            {treatmentGroups.fullart.length > 0 && (
              <optgroup label="🌄 Full Art">
                {treatmentGroups.fullart.map(treatment => (
                  <option key={treatment} value={treatment}>
                    {formatTreatment(treatment)}
                  </option>
                ))}
              </optgroup>
            )}
            
            {/* Special Treatments */}
            {treatmentGroups.special.length > 0 && (
              <optgroup label="✨ Special">
                {treatmentGroups.special.map(treatment => (
                  <option key={treatment} value={treatment}>
                    {formatTreatment(treatment)}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          
          {loading && (
            <p className="text-xs text-slate-500 mt-1">Loading available treatments...</p>
          )}
        </div>
      )}

      {/* Border Color Filter */}
      {availableFilters.borderColors.length > 1 && (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Border Color
          </label>
          <select
            value={filters.borderColor || 'all'}
            onChange={(e) => onFilterChange('borderColor', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
            <option value="all">All Borders</option>
            {availableFilters.borderColors.map(border => (
              <option key={border} value={border}>
                {border === 'black' && '⬛ Black'}
                {border === 'borderless' && '🖼️ Borderless'}
                {border === 'white' && '⬜ White'}
                {border === 'yellow' && '🟨 Yellow (Winner)'}
                {!['black', 'borderless', 'white', 'yellow'].includes(border) && border}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Finish Filter (Foil/Non-foil) */}
      {availableFilters.finishes.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Finish
          </label>
          <select
            value={filters.finish || 'all'}
            onChange={(e) => onFilterChange('finish', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
            <option value="all">All Finishes</option>
            {availableFilters.finishes.map(finish => (
              <option key={finish} value={finish}>
                {finish === 'foil' && '✨ Foil'}
                {finish === 'nonfoil' && '🔳 Non-foil'}
                {!['foil', 'nonfoil'].includes(finish) && finish}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Special Foil Types (if any exist) */}
      {availableFilters.promoTypes.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Special Foil Type
          </label>
          <select
            value={filters.promoType || 'all'}
            onChange={(e) => onFilterChange('promoType', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
            <option value="all">All Foil Types</option>
            {availableFilters.promoTypes.map(promo => (
              <option key={promo} value={promo}>
                {formatTreatment(promo)}
              </option>
            ))}
          </select>
          
          <p className="text-xs text-slate-500 mt-1">
            Premium foil treatments like Galaxy, Surge, Textured, etc.
          </p>
        </div>
      )}

      {/* Frame Effects (if any exist) */}
      {availableFilters.frameEffects.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Frame Effect
          </label>
          <select
            value={filters.frameEffect || 'all'}
            onChange={(e) => onFilterChange('frameEffect', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
            <option value="all">All Frame Effects</option>
            {availableFilters.frameEffects.map(effect => (
              <option key={effect} value={effect}>
                {formatTreatment(effect)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* No Variations Message */}
      {!loading && 
       availableFilters.treatments.length === 0 && 
       availableFilters.borderColors.length === 0 && 
       availableFilters.finishes.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            No variation data available for this selection. Try selecting a different game or set.
          </p>
        </div>
      )}

      {/* Active Filters Summary */}
      {(filters.treatment !== 'all' || 
        filters.borderColor !== 'all' || 
        filters.finish !== 'all' || 
        filters.promoType !== 'all' || 
        filters.frameEffect !== 'all') && (
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">Active Filters</span>
            <button
              onClick={() => {
                onFilterChange('treatment', 'all');
                onFilterChange('borderColor', 'all');
                onFilterChange('finish', 'all');
                onFilterChange('promoType', 'all');
                onFilterChange('frameEffect', 'all');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              Clear All
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {filters.treatment !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {formatTreatment(filters.treatment)}
                <button
                  onClick={() => onFilterChange('treatment', 'all')}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                  aria-label="Remove treatment filter"
                >
                  ✕
                </button>
              </span>
            )}
            
            {filters.borderColor !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                {filters.borderColor} border
                <button
                  onClick={() => onFilterChange('borderColor', 'all')}
                  className="hover:bg-purple-200 rounded-full p-0.5"
                  aria-label="Remove border color filter"
                >
                  ✕
                </button>
              </span>
            )}
            
            {filters.finish !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                {filters.finish}
                <button
                  onClick={() => onFilterChange('finish', 'all')}
                  className="hover:bg-green-200 rounded-full p-0.5"
                  aria-label="Remove finish filter"
                >
                  ✕
                </button>
              </span>
            )}
            
            {filters.promoType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                {formatTreatment(filters.promoType)}
                <button
                  onClick={() => onFilterChange('promoType', 'all')}
                  className="hover:bg-yellow-200 rounded-full p-0.5"
                  aria-label="Remove promo type filter"
                >
                  ✕
                </button>
              </span>
            )}
            
            {filters.frameEffect !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full">
                {formatTreatment(filters.frameEffect)}
                <button
                  onClick={() => onFilterChange('frameEffect', 'all')}
                  className="hover:bg-pink-200 rounded-full p-0.5"
                  aria-label="Remove frame effect filter"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicVariationFilter;