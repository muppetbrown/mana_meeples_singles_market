import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Enhanced Cart Hook with expiry, cross-tab sync, and price validation
 * Provides robust cart management with advanced features
 */
export const useEnhancedCart = (API_URL) => {
  const [cart, setCart] = useState([]);
  const [cartNotifications, setCartNotifications] = useState([]);
  const [lastSync, setLastSync] = useState(Date.now());

  const CART_STORAGE_KEY = 'tcg-shop-cart';
  const CART_EXPIRY_DAYS = 7;
  const SYNC_INTERVAL = 1000; // Check for changes every second

  const syncIntervalRef = useRef(null);
  const isUpdatingRef = useRef(false);

  // Add notification
  const addNotification = useCallback((message, type = 'info', duration = 5000) => {
    const notification = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: Date.now()
    };

    setCartNotifications(prev => [...prev, notification]);

    // Auto-remove after duration
    setTimeout(() => {
      setCartNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, duration);
  }, []);

  // Load cart from localStorage with expiry check
  const loadCartFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (!stored) return [];

      const { cart: storedCart, timestamp } = JSON.parse(stored);

      // Check if cart has expired
      const expiryTime = CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // 7 days in ms
      if (Date.now() - timestamp > expiryTime) {
        localStorage.removeItem(CART_STORAGE_KEY);
        addNotification('Your cart has expired and been cleared.', 'info');
        return [];
      }

      return storedCart || [];
    } catch (error) {
      console.error('Failed to load cart from storage:', error);
      return [];
    }
  }, [addNotification]);

  // Save cart to localStorage with timestamp
  const saveCartToStorage = useCallback((cartData) => {
    try {
      const cartWithTimestamp = {
        cart: cartData,
        timestamp: Date.now(),
        version: 1 // For future compatibility
      };

      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartWithTimestamp));
      setLastSync(Date.now());
    } catch (error) {
      console.error('Failed to save cart to storage:', error);
      addNotification('Failed to save cart. Please try again.', 'error');
    }
  }, [addNotification]);

  // Cross-tab synchronization
  const syncWithStorage = useCallback(() => {
    if (isUpdatingRef.current) return;

    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (!stored) return;

      const { cart: storedCart, timestamp } = JSON.parse(stored);

      // Only sync if storage was updated by another tab
      if (timestamp > lastSync) {
        setCart(storedCart || []);
        setLastSync(timestamp);
      }
    } catch (error) {
      console.error('Failed to sync with storage:', error);
    }
  }, [lastSync]);

  // Listen for storage changes (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === CART_STORAGE_KEY) {
        syncWithStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Set up periodic sync check
    syncIntervalRef.current = setInterval(syncWithStorage, SYNC_INTERVAL);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [syncWithStorage]);

  // Initialize cart from storage
  useEffect(() => {
    const storedCart = loadCartFromStorage();
    setCart(storedCart);
  }, [loadCartFromStorage]);

  // Save cart to storage whenever it changes
  useEffect(() => {
    if (cart.length > 0 || lastSync > 0) {
      isUpdatingRef.current = true;
      saveCartToStorage(cart);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    }
  }, [cart, lastSync, saveCartToStorage]);

  // Validate item prices against current market data
  const validateItemPrice = useCallback(async (item) => {
    try {
      const response = await fetch(`${API_URL}/cards/${item.id}/current-price`);
      if (!response.ok) return item; // If API fails, keep original

      const { price: currentPrice } = await response.json();

      // If price changed by more than 5%, flag it
      const priceDifference = Math.abs(currentPrice - item.price) / item.price;
      if (priceDifference > 0.05) {
        return {
          ...item,
          originalPrice: item.price,
          currentPrice,
          priceChanged: true
        };
      }

      return item;
    } catch (error) {
      console.error('Failed to validate price for item:', item.id, error);
      return item; // Keep original item if validation fails
    }
  }, [API_URL]);

  // Validate all cart items
  const validateCart = useCallback(async () => {
    if (cart.length === 0) return;

    try {
      const validatedItems = await Promise.all(
        cart.map(item => validateItemPrice(item))
      );

      const priceChangedItems = validatedItems.filter(item => item.priceChanged);

      if (priceChangedItems.length > 0) {
        addNotification(
          `Price changes detected for ${priceChangedItems.length} item(s). Please review your cart.`,
          'warning',
          10000
        );
        setCart(validatedItems);
      }
    } catch (error) {
      console.error('Failed to validate cart:', error);
    }
  }, [cart, validateItemPrice, addNotification]);

  // Check for out of stock items
  const checkStock = useCallback(async () => {
    if (cart.length === 0) return;

    try {
      const stockChecks = await Promise.all(
        cart.map(async (item) => {
          const response = await fetch(`${API_URL}/cards/${item.id}/stock`);
          if (!response.ok) return item;

          const { stock } = await response.json();
          return {
            ...item,
            currentStock: stock,
            outOfStock: stock < item.quantity
          };
        })
      );

      const outOfStockItems = stockChecks.filter(item => item.outOfStock);

      if (outOfStockItems.length > 0) {
        addNotification(
          `${outOfStockItems.length} item(s) in your cart are now out of stock.`,
          'error',
          10000
        );
        setCart(stockChecks);
      }
    } catch (error) {
      console.error('Failed to check stock:', error);
    }
  }, [cart, API_URL, addNotification]);

  // Add item to cart with error handling
  const addToCart = useCallback((item) => {
    try {
      // Validate item before adding
      if (!item || !item.id || !item.name || !item.price) {
        addNotification('Invalid item - cannot add to cart', 'error');
        return;
      }

      // Check if item is still in stock
      if (item.stock <= 0) {
        addNotification(`${item.name} is out of stock`, 'error');
        return;
      }

      setCart(prevCart => {
        const existingIndex = prevCart.findIndex(
          cartItem => cartItem.id === item.id && cartItem.quality === item.quality
        );

        if (existingIndex >= 0) {
          // Check if we can add more
          const existingItem = prevCart[existingIndex];
          if (existingItem.quantity >= item.stock) {
            addNotification(`Cannot add more - only ${item.stock} in stock`, 'warning');
            return prevCart;
          }

          // Update quantity
          const updated = [...prevCart];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: Math.min(existingItem.quantity + 1, item.stock)
          };
          return updated;
        } else {
          // Add new item
          return [...prevCart, { ...item, quantity: 1, addedAt: Date.now() }];
        }
      });

      addNotification(`Added ${item.name} to cart`, 'success', 3000);
    } catch (error) {
      console.error('Error adding item to cart:', error);
      addNotification('Failed to add item to cart. Please try again.', 'error');
    }
  }, [addNotification]);

  // Remove item from cart
  const removeFromCart = useCallback((itemId, quality) => {
    setCart(prevCart => {
      const filtered = prevCart.filter(
        item => !(item.id === itemId && item.quality === quality)
      );

      if (filtered.length !== prevCart.length) {
        addNotification('Item removed from cart', 'info', 2000);
      }

      return filtered;
    });
  }, [addNotification]);

  // Update item quantity
  const updateQuantity = useCallback((itemId, quality, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId, quality);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === itemId && item.quality === quality
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  }, [removeFromCart]);

  // Clear entire cart
  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
    addNotification('Cart cleared', 'info', 2000);
  }, [addNotification]);

  // Clear expired items (older than 7 days)
  const clearExpiredItems = useCallback(() => {
    const now = Date.now();
    const expiredThreshold = CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    setCart(prevCart => {
      const filtered = prevCart.filter(item => {
        const age = now - (item.addedAt || now);
        return age < expiredThreshold;
      });

      if (filtered.length !== prevCart.length) {
        const removedCount = prevCart.length - filtered.length;
        addNotification(
          `Removed ${removedCount} expired item(s) from cart`,
          'info',
          5000
        );
      }

      return filtered;
    });
  }, [addNotification]);

  // Get cart statistics
  const getCartStats = useCallback(() => {
    const total = cart.reduce((sum, item) => {
      const price = item.priceChanged ? item.currentPrice : item.price;
      return sum + (price * item.quantity);
    }, 0);

    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueItems = cart.length;
    const priceChangedItems = cart.filter(item => item.priceChanged).length;
    const outOfStockItems = cart.filter(item => item.outOfStock).length;

    return {
      total,
      itemCount,
      uniqueItems,
      priceChangedItems,
      outOfStockItems
    };
  }, [cart]);

  // Periodic validation (every 5 minutes)
  useEffect(() => {
    const validationInterval = setInterval(() => {
      validateCart();
      checkStock();
      clearExpiredItems();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(validationInterval);
  }, [validateCart, checkStock, clearExpiredItems]);

  return {
    cart,
    cartNotifications,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    validateCart,
    checkStock,
    getCartStats,
    clearExpiredItems
  };
};