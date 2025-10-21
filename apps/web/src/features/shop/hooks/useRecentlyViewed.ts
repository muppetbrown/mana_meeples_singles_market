// ============================================================================
// features/shop/hooks/useRecentlyViewed.ts - Recently viewed cards
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import type { Card } from '@/types';

const STORAGE_KEY = 'mana_meeples_recently_viewed';
const MAX_ITEMS = 20;

/**
 * Track recently viewed cards
 */
export function useRecentlyViewed() {
  const [items, setItems] = useState<Card[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.warn('Failed to save recently viewed:', error);
    }
  }, [items]);

  /**
   * Add card to recently viewed
   */
  const addCard = useCallback((card: Card) => {
    setItems(current => {
      // Remove if already exists
      const filtered = current.filter(item => item.id !== card.id);
      
      // Add to front
      const updated = [card, ...filtered];
      
      // Limit to MAX_ITEMS
      return updated.slice(0, MAX_ITEMS);
    });
  }, []);

  /**
   * Clear recently viewed
   */
  const clear = useCallback(() => {
    setItems([]);
  }, []);

  return {
    items,
    addCard,
    clear
  };
}