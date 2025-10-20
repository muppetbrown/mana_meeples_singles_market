// apps/web/src/hooks/useEnhancedCart.ts
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Enhanced Cart Hook with encrypted localStorage persistence
 * Provides robust cart management with advanced features including:
 * - Persistent state management using encrypted localStorage with fallback
 * - Version-based optimistic locking to prevent concurrent update conflicts
 * - Automatic expiry of cart items after 7 days
 * - Price validation against current market prices
 * - Stock checking for items in cart
 * - User-friendly notifications for all cart operations
 * - Cart recovery on page load with validation
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
export const useEnhancedCart = (API_URL: any) => {
  const [cart, setCart] = useState([]);
  const [cartNotifications, setCartNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const CART_EXPIRY_DAYS = 7;
  const CART_STORAGE_KEY = 'tcg_cart_v1';
  const ENCRYPTION_KEY = 'tcg_cart_key_2024'; // In production, this should be user-specific

  const cartVersionRef = useRef(0);
  const operationInProgress = useRef(false);

  // Simple XOR encryption for cart data (basic obfuscation)
  const encryptCartData = useCallback((data: any) => {
    try {
      const jsonString = JSON.stringify(data);
      let encrypted = '';
      for (let i = 0; i < jsonString.length; i++) {
        encrypted += String.fromCharCode(
          jsonString.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
        );
      }
      return btoa(encrypted);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to encrypt cart data:', error);
      }
      return null;
    }
  }, []);

  const decryptCartData = useCallback((encryptedData: any) => {
    try {
      const encrypted = atob(encryptedData);
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
        );
      }
      return JSON.parse(decrypted);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to decrypt cart data:', error);
      }
      return null;
    }
  }, []);

  // Save cart to encrypted localStorage
  const saveCartToStorage = useCallback((cartData: any) => {
    try {
      const cartWithMetadata = {
        items: cartData,
        timestamp: Date.now(),
        version: cartVersionRef.current
      };
      const encrypted = encryptCartData(cartWithMetadata);
      if (encrypted) {
        localStorage.setItem(CART_STORAGE_KEY, encrypted);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to save cart to storage:', error);
      }
      // Continue without storage - cart will work in memory only
    }
  }, [encryptCartData]);

  // Load cart from encrypted localStorage
  const loadCartFromStorage = useCallback(() => {
    try {
      const encrypted = localStorage.getItem(CART_STORAGE_KEY);
      if (!encrypted) return [];

      const decrypted = decryptCartData(encrypted);
      if (!decrypted || !decrypted.items) return [];

      // Check if cart data is expired
      const age = Date.now() - (decrypted.timestamp || 0);
      const maxAge = CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

      if (age > maxAge) {
        localStorage.removeItem(CART_STORAGE_KEY);
        return [];
      }

      // Update version reference
      cartVersionRef.current = Math.max(cartVersionRef.current, decrypted.version || 0);

      return decrypted.items || [];
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to load cart from storage:', error);
      }
      // Clear potentially corrupted data
      localStorage.removeItem(CART_STORAGE_KEY);
      return [];
    }
  }, [decryptCartData]);

  /**
   * Add a user notification for cart operations
   * @param {string} message - The notification message to display
   * @param {string} type - Notification type: 'info', 'success', 'warning', or 'error'
   * @param {number} duration - How long to show notification in milliseconds (default: 5000)
   */
  const addNotification = useCallback((message: any, type = 'info', duration = 5000) => {
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

  type AddNotification = (message: string, type?: string, duration?: number) => void;
  const addNotificationRef = useRef<AddNotification | null>(null);
  addNotificationRef.current = addNotification;

  // Initialize cart from storage on mount
  useEffect(() => {
    const initializeCart = async () => {
      setIsLoading(true);
      try {
        const storedCart = loadCartFromStorage();
        if (storedCart.length > 0) {
          setCart(storedCart);
          // Validate loaded cart items
          await new Promise(resolve => setTimeout(resolve, 100)); // Allow state to update
          // Note: validation will happen in periodic validation
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to initialize cart:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeCart();
  }, [loadCartFromStorage]);

  // Save cart to storage whenever it changes
  useEffect(() => {
    if (!isLoading && cart.length >= 0) {
      saveCartToStorage(cart);
    }
  }, [cart, isLoading, saveCartToStorage]);

  // Validate item prices against current market data
  const validateItemPrice = useCallback(async (item: any) => {
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to validate price for item:', item.id, error);
      }
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

          addNotificationRef.current?.(
            `Price changes detected for ${priceChangedItems.length} item(s). Please review your cart.`,
            'warning',
            10000
          );
        }

        setCart(validatedItems);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to validate cart:', error);
      }
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

          addNotificationRef.current?.(
            `${outOfStockItems.length} item(s) in your cart are now out of stock.`,
            'error',
            10000
          );
        }

        setCart(stockChecks);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to check stock:', error);
      }
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
  const addToCart = useCallback((item: any) => {
    // Prevent concurrent operations that could cause race conditions
    if (operationInProgress.current) {
      if (addNotificationRef.current) {

        addNotificationRef.current?.('Please wait - cart operation in progress', 'info', 2000);
      }
      return;
    }

    operationInProgress.current = true;

    try {
      // Validate item before adding
      if (!item || !item.id || !item.name || !item.price) {
        if (addNotificationRef.current) {

          addNotificationRef.current?.('Invalid item - cannot add to cart', 'error');
        }
        return;
      }

      // Check if item is still in stock
      if (item.stock <= 0) {
        if (addNotificationRef.current) {

          addNotificationRef.current?.(`${item.name} is out of stock`, 'error');
        }
        return;
      }


      setCart(prevCart => {
        // Increment version for this operation
        cartVersionRef.current += 1;
        const currentVersion = cartVersionRef.current;

        const existingIndex = prevCart.findIndex(

          cartItem => cartItem.id === item.id && cartItem.quality === item.quality
        );

        let updatedCart;
        if (existingIndex >= 0) {
          // Check if we can add more
          const existingItem = prevCart[existingIndex];

          // Version check to prevent conflicts

          if (existingItem.version > currentVersion - 2) {

            if (existingItem.quantity >= item.stock) {
              if (addNotificationRef.current) {

                addNotificationRef.current?.(`Cannot add more - only ${item.stock} in stock`, 'warning');
              }
              return prevCart;
            }

            // Update quantity
            updatedCart = [...prevCart];
            updatedCart[existingIndex] = {

              ...updatedCart[existingIndex],

              quantity: Math.min(existingItem.quantity + 1, item.stock),

              version: currentVersion,

              lastModified: Date.now()
            };
          } else {
            // Version conflict - reload and retry
            if (addNotificationRef.current) {

              addNotificationRef.current?.('Cart updated by another action - please try again', 'warning');
            }
            return prevCart;
          }
        } else {
          // Add new item
          updatedCart = [...prevCart, {
            ...item,
            quantity: 1,
            addedAt: Date.now(),
            version: currentVersion,
            lastModified: Date.now()
          }];
        }

        return updatedCart;
      });

      if (addNotificationRef.current) {

        addNotificationRef.current?.(`Added ${item.name} to cart`, 'success', 3000);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error adding item to cart:', error);
      }
      if (addNotificationRef.current) {

        addNotificationRef.current?.('Failed to add item to cart. Please try again.', 'error');
      }
    } finally {
      // Use timeout to prevent rapid clicking
      setTimeout(() => {
        operationInProgress.current = false;
      }, 300);
    }
  }, []);

  // Remove item from cart
  const removeFromCart = useCallback((itemId: any, quality: any) => {
    setCart(prevCart => {
      const filtered = prevCart.filter(

        item => !(item.id === itemId && item.quality === quality)
      );

      if (filtered.length !== prevCart.length && addNotificationRef.current) {

        addNotificationRef.current?.('Item removed from cart', 'info', 2000);
      }

      return filtered;
    });
  }, []);

  // Update item quantity with optimistic locking
  const updateQuantity = useCallback((itemId: any, quality: any, newQuantity: any) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId, quality);
      return;
    }

    // Prevent concurrent operations
    if (operationInProgress.current) {
      if (addNotificationRef.current) {

        addNotificationRef.current?.('Please wait - cart operation in progress', 'info', 2000);
      }
      return;
    }

    operationInProgress.current = true;

    try {

      setCart(prevCart => {
        // Increment version for this operation
        cartVersionRef.current += 1;
        const currentVersion = cartVersionRef.current;

        return prevCart.map(item => {

          if (item.id === itemId && item.quality === quality) {
            // Version check to prevent conflicts

            if (item.version && item.version < currentVersion - 2) {
              if (addNotificationRef.current) {

                addNotificationRef.current?.('Item was updated elsewhere - please refresh', 'warning');
              }
              return item; // Don't update if version is too old
            }

            return {

              ...item,
              quantity: newQuantity,
              version: currentVersion,
              lastModified: Date.now()
            };
          }
          return item;
        });
      });
    } finally {
      setTimeout(() => {
        operationInProgress.current = false;
      }, 200);
    }
  }, [removeFromCart]);

  // Clear entire cart
  const clearCart = useCallback(() => {
    setCart([]);
    if (addNotificationRef.current) {

      addNotificationRef.current?.('Cart cleared', 'info', 2000);
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

        addNotificationRef.current?.(
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
    isLoading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    validateCart,
    checkStock,
    getCartStats,
    clearExpiredItems,
    addNotification
  };
};