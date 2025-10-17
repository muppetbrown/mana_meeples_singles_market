import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing recently viewed cards using session storage
 * Tracks the last 10 viewed cards during the session
 */
export const useRecentlyViewed = () => {
  const STORAGE_KEY = 'tcg_recently_viewed';
  const MAX_ITEMS = 10;

  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // Load recently viewed cards from session storage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate that it's an array
        if (Array.isArray(parsed)) {
          // @ts-expect-error TS(2345): Argument of type 'any[]' is not assignable to para... Remove this comment to see the full error message
          setRecentlyViewed(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to load recently viewed cards:', error);
      // Clear corrupted data
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Add a card to recently viewed list
  const addToRecentlyViewed = useCallback((card: any) => {
    if (!card || !card.id) return;

    // @ts-expect-error TS(2345): Argument of type '(prev: never[]) => { id: any; na... Remove this comment to see the full error message
    setRecentlyViewed(prev => {
      // Remove the card if it already exists (to avoid duplicates)
      // @ts-expect-error TS(2339): Property 'id' does not exist on type 'never'.
      const filtered = prev.filter(item => item.id !== card.id);

      // Create new array with the card at the beginning
      const updated = [
        {
          id: card.id,
          name: card.name,
          image_url: card.image_url,
          set_name: card.set_name,
          card_number: card.card_number,
          game_name: card.game_name,
          viewedAt: new Date().toISOString()
        },
        ...filtered
      ].slice(0, MAX_ITEMS); // Keep only the most recent MAX_ITEMS

      // Save to session storage
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to save recently viewed cards:', error);
      }

      return updated;
    });
  }, []);

  // Clear recently viewed list
  const clearRecentlyViewed = useCallback(() => {
    setRecentlyViewed([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear recently viewed cards:', error);
    }
  }, []);

  // Remove a specific card from recently viewed
  const removeFromRecentlyViewed = useCallback((cardId: any) => {
    setRecentlyViewed(prev => {
      // @ts-expect-error TS(2339): Property 'id' does not exist on type 'never'.
      const updated = prev.filter(item => item.id !== cardId);

      // Update session storage
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to update recently viewed cards:', error);
      }

      return updated;
    });
  }, []);

  return {
    recentlyViewed,
    addToRecentlyViewed,
    clearRecentlyViewed,
    removeFromRecentlyViewed
  };
};