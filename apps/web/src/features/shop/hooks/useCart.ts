import { useState, useCallback, useEffect } from 'react';
import type { CartItem, Cart } from '@/types';

const STORAGE_KEY = 'mana_meeples_cart';

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [cartNotifications, setCartNotifications] = useState<Notification[]>([]);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.warn('Failed to save cart:', error);
    }
  }, [items]);

  // Auto-clear notifications after 5 seconds
  useEffect(() => {
    if (cartNotifications.length > 0) {
      const timer = setTimeout(() => {
        setCartNotifications(prev => prev.slice(1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [cartNotifications]);

  const cart: Cart = {
    items,
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
  };

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setItems(current => {
      const existingIndex = current.findIndex(
        i => i.card_id === item.card_id && i.variation_key === item.variation_key
      );

      if (existingIndex >= 0) {
        const updated = [...current];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        };
        return updated;
      }

      return [...current, { ...item, quantity }];
    });
  }, []);

  const addToCart = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    addItem(item, quantity);
    setCartNotifications(prev => [...prev, {
      id: Date.now(),
      message: `Added ${item.card_name} to cart`,
      type: 'success'
    }]);
  }, [addItem]);

  const updateQuantity = useCallback((cardId: number, variationKey: string, quantity: number) => {
    setItems(current => {
      if (quantity <= 0) {
        return current.filter(
          item => !(item.card_id === cardId && item.variation_key === variationKey)
        );
      }

      return current.map(item =>
        item.card_id === cardId && item.variation_key === variationKey
          ? { ...item, quantity }
          : item
      );
    });
  }, []);

  const removeItem = useCallback((cardId: number, variationKey: string) => {
    setItems(current =>
      current.filter(item => !(item.card_id === cardId && item.variation_key === variationKey))
    );
  }, []);

  const removeFromCart = useCallback((cardId: number, variationKey: string) => {
    removeItem(cardId, variationKey);
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getItem = useCallback((cardId: number, variationKey: string) => {
    return items.find(item => item.card_id === cardId && item.variation_key === variationKey);
  }, [items]);

  const hasItem = useCallback((cardId: number, variationKey: string) => {
    return items.some(item => item.card_id === cardId && item.variation_key === variationKey);
  }, [items]);

  const addNotification = useCallback((message: string, type: Notification['type'] = 'info', duration = 5000) => {
    const id = Date.now();
    setCartNotifications(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setCartNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }
  }, []);

  return {
    cart,
    addItem,
    addToCart,
    updateQuantity,
    removeItem,
    removeFromCart,
    clearCart,
    getItem,
    hasItem,
    cartNotifications,
    addNotification
  };
}