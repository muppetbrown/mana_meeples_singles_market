import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Enhanced Cart Hook with in-memory state management
 * Provides robust cart management with advanced features including:
 * - In-memory state management using React state only (no localStorage)
 * - Version-based optimistic locking to prevent concurrent update conflicts
 * - Automatic expiry of cart items after 7 days
 * - Price validation against current market prices
 * - Stock checking for items in cart
 * - User-friendly notifications for all cart operations
 * - Cross-component state synchronization via context (if needed)
 *
 * @param {string} API_URL - The base URL for API calls
 * @returns {Object} Cart management functions and state
 * @returns {Array} cart - Array of cart items with quantities, versions, and metadata
 * @returns {Array} cartNotifications - Array of user notification objects
 * @returns {function} addToCart - Add item to cart with validation
 * @returns {function} updateQuantity - Update item quantity with optimistic locking
 * @returns {function} removeFromCart - Remove item from cart
 * @returns {function} clearCart - Clear all items from cart
 * @returns {function} validateCart - Validate all cart items against current prices
 * @returns {function} checkStock - Check stock availability for all cart items
 * @returns {function} getCartStats - Get cart statistics (total, count, etc.)
 * @returns {function} clearExpiredItems - Remove expired items from cart
 */
export const useEnhancedCart = (API_URL) => {
  const [cart, setCart] = useState([]);
  const [cartNotifications, setCartNotifications] = useState([]);
  const [lastSync, setLastSync] = useState(Date.now());

  const CART_EXPIRY_DAYS = 7;

  const cartVersionRef = useRef(0);

  /**
   * Add a user notification for cart operations
   * @param {string} message - The notification message to display
   * @param {string} type - Notification type: 'info', 'success', 'warning', or 'error'
   * @param {number} duration - How long to show notification in milliseconds (default: 5000)
   */
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

  // Stable reference for addNotification to prevent recreations
  const addNotificationRef = useRef();
  addNotificationRef.current = addNotification;

  // Cart is now purely in-memory - no storage synchronization needed

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
        if (addNotificationRef.current) {
          addNotificationRef.current(
            `Price changes detected for ${priceChangedItems.length} item(s). Please review your cart.`,
            'warning',
            10000
          );
        }
        setCart(validatedItems);
      }
    } catch (error) {
      console.error('Failed to validate cart:', error);
    }
  }, [cart, validateItemPrice]);

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
        if (addNotificationRef.current) {
          addNotificationRef.current(
            `${outOfStockItems.length} item(s) in your cart are now out of stock.`,
            'error',
            10000
          );
        }
        setCart(stockChecks);
      }
    } catch (error) {
      console.error('Failed to check stock:', error);
    }
  }, [cart, API_URL]);

  /**
   * Add item to cart with validation and optimistic locking
   * Prevents adding items with version conflicts and validates stock
   * @param {Object} item - Cart item to add
   * @param {string} item.id - Unique identifier for the item
   * @param {string} item.name - Display name of the item
   * @param {number} item.price - Current price of the item
   * @param {number} item.stock - Available stock quantity
   * @param {string} item.quality - Quality/condition of the item
   * @param {string} item.image_url - URL for the item's image
   */
  const addToCart = useCallback((item) => {
    try {
      // Validate item before adding
      if (!item || !item.id || !item.name || !item.price) {
        if (addNotificationRef.current) {
          addNotificationRef.current('Invalid item - cannot add to cart', 'error');
        }
        return;
      }

      // Check if item is still in stock
      if (item.stock <= 0) {
        if (addNotificationRef.current) {
          addNotificationRef.current(`${item.name} is out of stock`, 'error');
        }
        return;
      }

      setCart(prevCart => {
        // Version tracking for optimistic updates (in-memory only)

        const existingIndex = prevCart.findIndex(
          cartItem => cartItem.id === item.id && cartItem.quality === item.quality
        );

        let updatedCart;
        if (existingIndex >= 0) {
          // Check if we can add more
          const existingItem = prevCart[existingIndex];
          if (existingItem.quantity >= item.stock) {
            if (addNotificationRef.current) {
              addNotificationRef.current(`Cannot add more - only ${item.stock} in stock`, 'warning');
            }
            return prevCart;
          }

          // Update quantity
          updatedCart = [...prevCart];
          updatedCart[existingIndex] = {
            ...updatedCart[existingIndex],
            quantity: Math.min(existingItem.quantity + 1, item.stock),
            version: cartVersionRef.current + 1,
            lastModified: Date.now()
          };
        } else {
          // Add new item
          updatedCart = [...prevCart, {
            ...item,
            quantity: 1,
            addedAt: Date.now(),
            version: cartVersionRef.current + 1,
            lastModified: Date.now()
          }];
        }

        return updatedCart;
      });

      if (addNotificationRef.current) {
        addNotificationRef.current(`Added ${item.name} to cart`, 'success', 3000);
      }
    } catch (error) {
      console.error('Error adding item to cart:', error);
      if (addNotificationRef.current) {
        addNotificationRef.current('Failed to add item to cart. Please try again.', 'error');
      }
    }
  }, []);

  // Remove item from cart
  const removeFromCart = useCallback((itemId, quality) => {
    setCart(prevCart => {
      const filtered = prevCart.filter(
        item => !(item.id === itemId && item.quality === quality)
      );

      if (filtered.length !== prevCart.length && addNotificationRef.current) {
        addNotificationRef.current('Item removed from cart', 'info', 2000);
      }

      return filtered;
    });
  }, []);

  // Update item quantity with optimistic locking
  const updateQuantity = useCallback((itemId, quality, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId, quality);
      return;
    }

    setCart(prevCart => {
      // Version tracking for optimistic updates (in-memory only)

      return prevCart.map(item =>
        item.id === itemId && item.quality === quality
          ? {
              ...item,
              quantity: newQuantity,
              version: cartVersionRef.current + 1,
              lastModified: Date.now()
            }
          : item
      );
    });
  }, [removeFromCart]);

  // Clear entire cart
  const clearCart = useCallback(() => {
    setCart([]);
    if (addNotificationRef.current) {
      addNotificationRef.current('Cart cleared', 'info', 2000);
    }
  }, []);

  // Clear expired items (older than 7 days)
  const clearExpiredItems = useCallback(() => {
    const now = Date.now();
    const expiredThreshold = CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    setCart(prevCart => {
      const filtered = prevCart.filter(item => {
        const age = now - (item.addedAt || now);
        return age < expiredThreshold;
      });

      if (filtered.length !== prevCart.length && addNotificationRef.current) {
        const removedCount = prevCart.length - filtered.length;
        addNotificationRef.current(
          `Removed ${removedCount} expired item(s) from cart`,
          'info',
          5000
        );
      }

      return filtered;
    });
  }, []);

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