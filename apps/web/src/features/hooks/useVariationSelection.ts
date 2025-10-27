import { useState, useCallback, useEffect, useMemo } from 'react';
import type { StorefrontCard } from '@/types';

export function useVariationSelection(cards: StorefrontCard[]) {
  const [selections, setSelections] = useState<Record<number, string>>({});

  // Memoize card IDs to prevent unnecessary re-runs
  const cardIds = useMemo(() => new Set(cards.map(c => c.id)), [cards]);

  const selectVariation = useCallback((cardId: number, varKey: string) => {
    setSelections(prev => ({ ...prev, [cardId]: varKey }));
  }, []);

  const getSelected = useCallback((cardId: number) => {
    return selections[cardId];
  }, [selections]);

  // Optimized clearStaleSelections with memoized card IDs
  const clearStaleSelections = useCallback(() => {
    setSelections(prev => {
      // Check if any selections need to be removed
      const staleIds = Object.keys(prev).filter(id => !cardIds.has(Number(id)));

      // If no stale selections, return original object to prevent re-render
      if (staleIds.length === 0) {
        return prev;
      }

      // Create filtered object only if necessary
      const filtered: Record<number, string> = {};
      Object.entries(prev).forEach(([id, key]) => {
        if (cardIds.has(Number(id))) {
          filtered[Number(id)] = key as string;
        }
      });
      return filtered;
    });
  }, [cardIds]);

  // Clear selections for cards that no longer exist - but only when card IDs change
  useEffect(() => {
    clearStaleSelections();
  }, [cardIds, clearStaleSelections]);

  return {
    selections,
    selectedVariations: selections, // Alias for backward compatibility
    selectVariation,
    getSelected,
    clearStaleSelections
  };
}