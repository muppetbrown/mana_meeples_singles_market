// ============================================================================
// features/shop/hooks/useCart.ts - Simplified cart management
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import type { CartItem, Cart } from '@/types';

const STORAGE_KEY = 'mana_meeples_cart';

/**
 * Cart management hook
 * Handles cart state, localStorage persistence, and cart operations
 */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [cartNotifications, setCartNotifications] = useState<any[]>([]);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.warn('Failed to save cart to localStorage:', error);
    }
  }, [items]);

  // Calculate totals
  const cart: Cart = {
    items,
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
  };

  /**
   * Add item to cart (or update quantity if exists)
   */
  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setItems(current => {
      const existingIndex = current.findIndex(
        i => i.cardId === item.cardId && i.variationKey === item.variationKey
      );

      if (existingIndex >= 0) {
        // Update existing item
        const updated = [...current];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        };
        return updated;
      }

      // Add new item
      return [...current, { ...item, quantity }];
    });
  }, []);

  /**
   * Update item quantity
   */
  const updateQuantity = useCallback((cardId: number, variationKey: string, quantity: number) => {
    setItems(current => {
      if (quantity <= 0) {
        // Remove item if quantity is 0
        return current.filter(
          item => !(item.cardId === cardId && item.variationKey === variationKey)
        );
      }

      return current.map(item =>
        item.cardId === cardId && item.variationKey === variationKey
          ? { ...item, quantity }
          : item
      );
    });
  }, []);

  /**
   * Remove item from cart
   */
  const removeItem = useCallback((cardId: number, variationKey: string) => {
    setItems(current =>
      current.filter(item => !(item.cardId === cardId && item.variationKey === variationKey))
    );
  }, []);

  /**
   * Clear entire cart
   */
  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  /**
   * Get specific item from cart
   */
  const getItem = useCallback((cardId: number, variationKey: string) => {
    return items.find(item => item.cardId === cardId && item.variationKey === variationKey);
  }, [items]);

  /**
   * Check if item is in cart
   */
  const hasItem = useCallback((cardId: number, variationKey: string) => {
    return items.some(item => item.cardId === cardId && item.variationKey === variationKey);
  }, [items]);

  const addToCart = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    addItem(item, quantity);
    // Add notification
    setCartNotifications(prev => [...prev, { 
      id: Date.now(), 
      message: `Added ${item.card_name} to cart` 
    }]);
  }, [addItem]);

  const removeFromCart = useCallback((cardId: number, quality: string) => {
    removeItem(cardId, quality);
  }, [removeItem]);

  const addNotification = useCallback((notification: any) => {
    setCartNotifications(prev => [...prev, notification]);
  }, []);

  return {
    cart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    getItem,
    hasItem,
    // Add these:
    cartNotifications,
    addToCart,
    removeFromCart,
    addNotification
  };
}