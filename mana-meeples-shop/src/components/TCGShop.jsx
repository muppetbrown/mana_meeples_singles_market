import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShoppingCart, X, Plus, Minus, Filter, Search, ChevronDown, LayoutGrid, List } from 'lucide-react';
import CurrencySelector from './CurrencySelector';
import Checkout from './Checkout';
import { useFilterCounts } from '../hooks/useFilterCounts';
import { useEnhancedCart } from '../hooks/useEnhancedCart';
import ErrorBoundary from './ErrorBoundary';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import { API_URL } from '../config/api';
import { useErrorHandler, withRetry, throttledFetch } from '../services/errorHandler';
import { FILTER_CONFIG, ACCESSIBILITY_CONFIG, VIRTUAL_SCROLL_CONFIG } from '../config/constants';
// Extracted components
import { highlightMatch } from './utils/searchUtils';
import CardSkeleton from './skeletons/CardSkeleton';
import SectionHeader from './common/SectionHeader';
import CardItem from './cards/CardItem';
import ListCardItem from './cards/ListCardItem';

// Lazy load VirtualCardGrid for code splitting
const VirtualCardGrid = React.lazy(() => import('./VirtualCardGrid'));

const TCGShop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cards, setCards] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create a stable handleError function to prevent unnecessary re-renders
  const errorHandler = useErrorHandler();
  const errorHandlerRef = useRef(errorHandler);
  errorHandlerRef.current = errorHandler; // Always keep ref up to date

  const handleError = useCallback((error, context) => {
    return errorHandlerRef.current.handleError(error, context);
  }, []); // No dependencies - use ref for current value
  const [showCart, setShowCart] = useState(false);
  const [showMiniCart, setShowMiniCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [selectedVariations, setSelectedVariations] = useState({});
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [viewMode, setViewMode] = useState('grid');

  // Request throttling - prevent multiple simultaneous calls to same endpoint
  const requestInFlight = useRef({
    cards: false,
    initialData: false,
    sets: false
  });

  // Track if initial load has been completed (React StrictMode compatibility)
  const initialLoadComplete = useRef(false);

  // Enhanced cart hook with localStorage persistence
  const {
    cart,
    cartNotifications,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    addNotification
  } = useEnhancedCart(API_URL);

  // Create a simple showNotification function that uses addNotification
  const showNotification = useCallback((message, type = 'info', duration = 5000) => {
    addNotification(message, type, duration);
  }, [addNotification]);

  // Initialize state from URL parameters
  const searchTerm = searchParams.get('search') || '';
  const selectedGame = searchParams.get('game') || 'all';

  // Enhanced filter states from URL - memoized to prevent hook dependency issues
  const filters = useMemo(() => ({
    quality: searchParams.get('quality') || 'all',
    rarity: searchParams.get('rarity') || 'all',
    foilType: searchParams.get('foilType') || 'all',
    language: searchParams.get('language') || 'English',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sortBy: searchParams.get('sortBy') || 'name',
    sortOrder: searchParams.get('sortOrder') || 'asc',
    set: searchParams.get('set') || 'all'
  }), [searchParams]);

  // Filter counts hook for dynamic counts in dropdowns
  const { getCount, filterCounts } = useFilterCounts(API_URL, { ...filters, game: selectedGame });

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    rarities: [],
    qualities: [],
    foilTypes: [],
    languages: []
  });
  const [availableSets, setAvailableSets] = useState([]);

  // Currency and localization with toggle - Default to NZD for NZ-based shop
  const [currency, setCurrency] = useState({ symbol: 'NZ$', rate: 1.0, code: 'NZD' });

  // Search autocomplete with proper debouncing and request cancellation
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const abortController = useRef(null);
  const searchTimeoutRef = useRef(null);
  const mobileFiltersRef = useRef(null);

  // Load initial data and currency detection
  useEffect(() => {
    const fetchInitialData = async () => {
      // Prevent multiple simultaneous initial data calls and React StrictMode duplicates
      if (requestInFlight.current.initialData || initialLoadComplete.current) {
        return;
      }

      try {
        requestInFlight.current.initialData = true;
        setLoading(true);
        setError(null);

        // Use sequential requests with throttling to prevent rate limiting
        // Load games first (most important)
        const gamesRes = await withRetry(() => throttledFetch(`${API_URL}/games`));

        // Add a delay before the next API call to ensure rate limiting
        await new Promise(resolve => setTimeout(resolve, 600));

        // Load filters next
        const filtersRes = await withRetry(() => throttledFetch(`${API_URL}/filters`));

        // Add another delay before optional currency detection
        await new Promise(resolve => setTimeout(resolve, 600));

        // Currency detection can happen in background (optional)
        withRetry(() => throttledFetch(`${API_URL}/currency/detect`)).catch(err => {
          // Silently fail currency detection - it's not critical
          console.log('Currency detection failed (non-critical):', err);
        });

        if (!gamesRes.ok) {
          throw new Error('Failed to fetch games');
        }

        const gamesData = await gamesRes.json();
        setGames(gamesData);


        // Set filter options if available
        if (filtersRes.ok) {
          const filtersData = await filtersRes.json();
          setFilterOptions(filtersData);
        }

      } catch (err) {
        const formattedError = handleError(err, { operation: 'loadInitialData' });
        setError(`${formattedError.title}: ${formattedError.message} Please refresh the page or check your connection.`);
        setLoading(false);
      } finally {
        requestInFlight.current.initialData = false;
        initialLoadComplete.current = true; // Mark initial load as complete
      }
    };

    fetchInitialData();
  }, [handleError]);

  // Offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      showNotification('Connection restored', 'success');
    };
    const handleOffline = () => {
      setIsOffline(true);
      showNotification('You are offline. Some features may not work.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showNotification]);

  // Clear stale variation selections when filters or search change
  useEffect(() => {
    setSelectedVariations(prev => {
      // Get current card IDs from cards array
      const currentCardIds = new Set(cards.map(card => card.id));

      // Keep only selections for cards that still exist
      const filteredSelections = {};
      Object.keys(prev).forEach(cardId => {
        if (currentCardIds.has(cardId)) {
          filteredSelections[cardId] = prev[cardId];
        }
      });

      return filteredSelections;
    });
  }, [cards, searchTerm, selectedGame, filters]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle shortcuts when not typing in inputs
      if (e.target.matches('input, textarea, select')) {
        // Exception: allow "?" shortcut even in inputs if it's just a question mark
        if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
          setShowKeyboardShortcuts(true);
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case '?':
          setShowKeyboardShortcuts(true);
          e.preventDefault();
          break;
        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            setShowMobileFilters(prev => !prev);
            e.preventDefault();
          }
          break;
        case 'g':
        case 'G':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
            e.preventDefault();
          }
          break;
        case 'c':
        case 'C':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            setShowCart(true);
            e.preventDefault();
          }
          break;
        case '/':
          // Focus search input
          const searchInput = document.querySelector('input[type="search"]');
          if (searchInput) {
            searchInput.focus();
            e.preventDefault();
          }
          break;
        case 'Escape':
          // Close any open modals/panels
          setShowKeyboardShortcuts(false);
          setShowCart(false);
          setShowMobileFilters(false);
          setShowSuggestions(false);
          e.preventDefault();
          break;
        default:
          // No action needed for other keys
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus trap for mobile filters modal
  useEffect(() => {
    if (showMobileFilters && mobileFiltersRef.current) {
      // Focus the first focusable element when modal opens
      const focusableElements = mobileFiltersRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      // Handle tab key to trap focus within modal
      const handleTabKey = (e) => {
        if (e.key === 'Tab') {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            // Shift + Tab: going backwards
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            // Tab: going forwards
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      };

      document.addEventListener('keydown', handleTabKey);
      return () => document.removeEventListener('keydown', handleTabKey);
    }
  }, [showMobileFilters]);

  // Fetch available sets when game changes (matching AdminDashboard logic)
  useEffect(() => {
    const fetchSets = async () => {
      if (selectedGame === 'all') {
        setAvailableSets([]);
        return;
      }

      // Prevent multiple simultaneous set fetches
      if (requestInFlight.current.sets) {
        return;
      }

      try {
        requestInFlight.current.sets = true;
        const gameId = getGameIdFromName(selectedGame);
        if (!gameId) return;

        const response = await withRetry(() => throttledFetch(`${API_URL}/sets?game_id=${gameId}`));

        if (response.ok) {
          const sets = await response.json();
          setAvailableSets(sets);
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch sets');
          }
          setAvailableSets([]);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching sets:', error);
        }
        setAvailableSets([]);
      } finally {
        requestInFlight.current.sets = false;
      }
    };

    fetchSets();
    // Reset set filter when game changes
    handleFilterChange('set', 'all');
  }, [selectedGame]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch cards with current filters
  const fetchCards = useCallback(async () => {
    // Prevent multiple simultaneous card fetches
    if (requestInFlight.current.cards) {
      return;
    }

    try {
      requestInFlight.current.cards = true;
      // Set loading state to true when starting card fetch
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        limit: '100',
        search: searchTerm,
        sort_by: filters.sortBy,
        sort_order: filters.sortOrder
      });

      if (selectedGame !== 'all') {
        const selectedGameData = games.find(g => g.name === selectedGame);
        if (selectedGameData) {
          queryParams.append('game_id', selectedGameData.id);
        }
      }

      if (filters.quality !== 'all') queryParams.append('quality', filters.quality);
      if (filters.rarity !== 'all') queryParams.append('rarity', filters.rarity);
      if (filters.foilType !== 'all') queryParams.append('foil_type', filters.foilType);
      if (filters.language !== 'English') queryParams.append('language', filters.language);
      if (filters.set !== 'all') queryParams.append('set_name', filters.set);
      if (filters.minPrice) queryParams.append('min_price', filters.minPrice);
      if (filters.maxPrice) queryParams.append('max_price', filters.maxPrice);

      const cardsData = await withRetry(async () => {
        const cardsRes = await throttledFetch(`${API_URL}/cards?${queryParams}`);
        if (!cardsRes.ok) {
          // Handle 429 errors specifically
          if (cardsRes.status === 429) {
            const error = new Error('Rate limit exceeded');
            error.status = 429;
            throw error;
          }
          throw new Error('API request failed');
        }
        return cardsRes.json();
      }, 3, 1000);

      // Group cards by base card (consolidated variants)
      const groupedCards = {};
      cardsData.cards.forEach(item => {
        const key = `${item.game_name}-${item.set_name}-${item.card_number}`;

        if (!groupedCards[key]) {
          groupedCards[key] = {
            id: key, // Use stable key as ID instead of inventory-specific item.id
            name: item.name,
            game_name: item.game_name,
            set_name: item.set_name,
            set_code: item.set_code,
            card_number: item.card_number,
            rarity: item.rarity,
            card_type: item.card_type,
            description: item.description,
            image_url: item.image_url,
            variations: []
          };
        }

        groupedCards[key].variations.push({
          inventory_id: item.inventory_id,
          quality: item.quality,
          variation_name: item.variation_name,
          foil_type: item.foil_type || 'Regular',
          language: item.language || 'English',
          price: parseFloat(item.price) * currency.rate,
          stock: item.stock_quantity,
          // Add unique identifier for variation selection
          variation_key: `${item.quality}-${item.foil_type || 'Regular'}-${item.language || 'English'}`
        });
      });

      setCards(Object.values(groupedCards));
    } catch (err) {
      const formattedError = handleError(err, { operation: 'fetchCards' });
      setError(`${formattedError.title}: ${formattedError.message} Try adjusting your filters or refreshing the page.`);
    } finally {
      // Always set loading to false when card fetch completes (success or error)
      setLoading(false);
      requestInFlight.current.cards = false;
    }
  }, [searchTerm, selectedGame, filters, games, currency.rate, handleError]);

  useEffect(() => {
    if (games.length > 0) {
      fetchCards();
    }
  }, [fetchCards, games]);

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clear any pending timeouts
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Cancel any ongoing requests
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []); // Empty dependency array means this runs only on unmount

  // Improved autocomplete search with debouncing and request cancellation
  const handleSearchChange = useCallback(async (value) => {
    // Update URL immediately for responsiveness
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value) {
        newParams.set('search', value);
      } else {
        newParams.delete('search');
      }
      return newParams;
    });

    // Cancel previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort();
    }

    if (value.length >= 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          // Create new AbortController for this request
          abortController.current = new AbortController();

          const res = await fetch(
            `${API_URL}/search/autocomplete?q=${encodeURIComponent(value)}`,
            { signal: abortController.current.signal }
          );

          if (res.ok) {
            const data = await res.json();
            setSearchSuggestions(data.suggestions || []);
            setShowSuggestions(true);
            setSelectedSuggestionIndex(-1);
          }
        } catch (err) {
          if (err.name !== 'AbortError') {
            if (process.env.NODE_ENV === 'development') {
              console.error('Autocomplete error:', err);
            }
          }
        }
      }, FILTER_CONFIG.DEBOUNCE_DELAY); // 300ms debounce for better UX
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  }, [setSearchParams]);

  // Handle filter changes with URL state management
  const handleFilterChange = useCallback((key, value) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value && value !== 'all' && value !== '') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      return newParams;
    });
  }, [setSearchParams]);

  // Handle game selection
  const handleGameChange = useCallback((game) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (game && game !== 'all') {
        newParams.set('game', game);
      } else {
        newParams.delete('game');
      }
      return newParams;
    });
  }, [setSearchParams]);

  // Clear all filters function
  const clearAllFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  // Get active filters for display
  const activeFilters = useMemo(() => {
    const active = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '' && value !== 'English') {
        let displayName = key;
        let displayValue = value;

        // Format display names
        switch (key) {
          case 'foilType': displayName = 'Foil'; break;
          case 'minPrice': displayName = 'Min Price'; displayValue = `$${value}`; break;
          case 'maxPrice': displayName = 'Max Price'; displayValue = `$${value}`; break;
          case 'sortBy': displayName = 'Sort'; break;
          case 'sortOrder': return; // Don't show sort order as separate filter
          default: displayName = key.charAt(0).toUpperCase() + key.slice(1); break;
        }

        active.push({ key, displayName, displayValue });
      }
    });

    if (searchTerm) {
      active.push({ key: 'search', displayName: 'Search', displayValue: searchTerm });
    }

    if (selectedGame && selectedGame !== 'all') {
      active.push({ key: 'game', displayName: 'Game', displayValue: selectedGame });
    }

    return active;
  }, [filters, searchTerm, selectedGame]);

  // Helper function to get game ID from name (matching AdminDashboard)
  const getGameIdFromName = (gameName) => {
    const gameMap = {
      'Magic: The Gathering': 1,
      'Pokemon': 2,
      'Yu-Gi-Oh!': 3
    };
    return gameMap[gameName] || null;
  };

  // Currency change function
  const handleCurrencyChange = (newCurrency) => {
    setCurrency(newCurrency);
  };

  // Show mini cart when items added
  useEffect(() => {
    if (cart.length > 0 && !showCart) {
      setShowMiniCart(true);
    }
  }, [cart, showCart]);

  // Update cart quantity function (wrapper for useEnhancedCart)
  const updateCartQuantity = useCallback((id, quality, delta) => {
    const existingItem = cart.find(item => item.id === id && item.quality === quality);
    if (existingItem) {
      const newQuantity = existingItem.quantity + delta;
      updateQuantity(id, quality, newQuantity);
    }
  }, [cart, updateQuantity]);

  // Memoized expensive calculations
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  // Group cards by sections for sorting
  const groupedCards = useMemo(() => {
    if (!cards.length) return [];

    const { sortBy } = filters;

    // If no sorting by name, set, rarity, or price, return ungrouped
    if (!['name', 'set', 'rarity', 'price', 'price_low', 'price_high'].includes(sortBy)) {
      return [{ section: null, cards }];
    }

    const groups = new Map();

    cards.forEach(card => {
      let sectionKey;
      let sectionTitle;

      if (sortBy === 'name') {
        const firstLetter = card.name.charAt(0).toUpperCase();
        sectionKey = firstLetter;
        sectionTitle = firstLetter;
      } else if (sortBy === 'set') {
        sectionKey = card.set_name;
        sectionTitle = card.set_name;
      } else if (sortBy === 'rarity') {
        // Group by rarity type
        const rarity = card.rarity || 'Unknown';
        sectionKey = rarity;
        sectionTitle = rarity;
      } else if (['price', 'price_low', 'price_high'].includes(sortBy)) {
        // Group by price ranges
        const price = card.variations?.[0]?.price || 0;
        let priceRange;

        if (price < 1) {
          priceRange = 'Under $1';
        } else if (price < 5) {
          priceRange = '$1 - $4.99';
        } else if (price < 10) {
          priceRange = '$5 - $9.99';
        } else if (price < 25) {
          priceRange = '$10 - $24.99';
        } else if (price < 50) {
          priceRange = '$25 - $49.99';
        } else if (price < 100) {
          priceRange = '$50 - $99.99';
        } else {
          priceRange = '$100+';
        }

        sectionKey = priceRange;
        sectionTitle = priceRange;
      }

      if (!groups.has(sectionKey)) {
        groups.set(sectionKey, {
          section: sectionTitle,
          cards: []
        });
      }

      groups.get(sectionKey).cards.push(card);
    });

    // Sort the sections
    const sortedGroups = Array.from(groups.values()).sort((a, b) => {
      if (sortBy === 'name') {
        return a.section.localeCompare(b.section);
      } else if (sortBy === 'set') {
        return a.section.localeCompare(b.section);
      } else if (sortBy === 'rarity') {
        // Sort rarities by power level
        const rarityOrder = {
          'Common': 1, 'Uncommon': 2, 'Rare': 3, 'Mythic': 4, 'Mythic Rare': 4,
          'Special': 5, 'Legendary': 5, 'Basic': 0, 'Unknown': 6
        };
        return (rarityOrder[a.section] || 6) - (rarityOrder[b.section] || 6);
      } else if (['price', 'price_low', 'price_high'].includes(sortBy)) {
        // Sort price ranges numerically
        const priceOrder = {
          'Under $1': 1, '$1 - $4.99': 2, '$5 - $9.99': 3, '$10 - $24.99': 4,
          '$25 - $49.99': 5, '$50 - $99.99': 6, '$100+': 7
        };
        const aOrder = priceOrder[a.section] || 8;
        const bOrder = priceOrder[b.section] || 8;

        // Reverse order for price_high
        if (sortBy === 'price_high') {
          return bOrder - aOrder;
        }
        return aOrder - bOrder;
      }
      return 0;
    });

    // Apply secondary alphabetical sorting within each group
    sortedGroups.forEach(group => {
      group.cards.sort((a, b) => a.name.localeCompare(b.name));
    });

    return sortedGroups;
  }, [cards, filters]);

  // Memoized card handlers
  const handleVariationChange = useCallback((cardId) => (e) => {
    setSelectedVariations(prev => ({
      ...prev,
      [cardId]: e.target.value
    }));
  }, []);

  const handleAddToCart = useCallback((card, selectedVariation) => () => {
    addToCart({
      id: card.id,
      inventory_id: selectedVariation.inventory_id,
      name: card.name,
      image_url: card.image_url,
      quality: selectedVariation.quality,
      price: selectedVariation.price,
      stock: selectedVariation.stock,
      foil_type: selectedVariation.foil_type,
      language: selectedVariation.language,
      game_name: card.game_name,
      set_name: card.set_name,
      card_number: card.card_number,
      rarity: card.rarity
    });
  }, [addToCart]);

  // Checkout handlers
  const handleCheckoutClick = useCallback(() => {
    setShowCart(false);
    setShowCheckout(true);
  }, []);

  const handleBackFromCheckout = useCallback(() => {
    setShowCheckout(false);
    setShowCart(false);
  }, []);

  const handleOrderSubmit = useCallback(async (orderData) => {
    try {
      // Here you would typically send the order to your backend
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        // Clear the cart after successful order
        clearCart();
        // Order submission was successful
        return true;
      } else {
        throw new Error('Failed to submit order');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Order submission error:', error);
      }
      throw error;
    }
  }, [clearCart]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
        >
          Skip to main content
        </a>

        {/* Skeleton Header */}
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="h-8 bg-slate-200 rounded w-32 animate-pulse"></div>
              <div className="flex items-center gap-4">
                <div className="h-6 bg-slate-200 rounded w-24 animate-pulse"></div>
                <div className="h-10 bg-slate-200 rounded w-10 animate-pulse"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Skeleton Content */}
        <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Skeleton Sidebar */}
            <aside className="lg:w-64 space-y-6">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="h-4 bg-slate-200 rounded w-20 mb-3 animate-pulse"></div>
                  <div className="h-10 bg-slate-200 rounded animate-pulse"></div>
                </div>
              ))}
            </aside>

            {/* Skeleton Cards Grid */}
            <div className="flex-1">
              <div className="mb-6">
                <div className="h-6 bg-slate-200 rounded w-48 animate-pulse"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 12 }, (_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Accessible loading announcement */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          Loading cards... If this takes a while, the API might be waking up.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Connection Error</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Show checkout if checkout is active
  if (showCheckout) {
    return (
      <ErrorBoundary>
        <Checkout
          cart={cart}
          currency={currency}
          onBack={handleBackFromCheckout}
          onOrderSubmit={handleOrderSubmit}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
      >
        Skip to main content
      </a>
      {/* Offline indicator */}
      {isOffline && (
        <div className="bg-red-600 text-white text-center py-2 px-4 text-sm font-medium">
          ⚠️ You are offline. Some features may not work properly.
        </div>
      )}

      <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TCG Singles
            </h1>
            <div className="flex items-center gap-3">
              {/* Currency Selector */}
              <CurrencySelector
                currency={currency}
                onCurrencyChange={handleCurrencyChange}
                className="flex-shrink-0"
              />

              {/* Shopping Cart */}
              <button
                onClick={() => setShowCart(true)}
                className="relative p-3 hover:bg-slate-100 rounded-lg transition-colors motion-reduce:transition-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                aria-label={`Open shopping cart with ${cartCount} items`}
              >
                <ShoppingCart className="w-6 h-6 text-slate-700" />
                <span
                  className={`absolute -top-1 -right-1 ${cartCount > 0 ? 'bg-blue-600' : 'bg-slate-400'} text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center`}
                  aria-live="assertive"
                  aria-label={`${cartCount} items in cart`}
                >
                    {cartCount}
                  </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setShowMobileFilters(true)}
            className="flex items-center gap-2 w-full px-4 py-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors motion-reduce:transition-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            aria-label="Open filters and search panel"
            aria-expanded={showMobileFilters}
          >
            <Filter className="w-5 h-5 text-slate-600" />
            <span className="font-medium text-slate-700">Filters & Search</span>
            <ChevronDown className="w-4 h-4 text-slate-600 ml-auto" />
          </button>
        </div>

        {/* Desktop Layout with Sidebar */}
        <div className="lg:flex lg:gap-6">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 sticky top-24">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Search & Filters</h2>

              {/* Search Bar */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="search"
                    placeholder="Card name, set, number..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setShowSuggestions(searchSuggestions.length > 0)}
                    onBlur={(e) => {
                      // Don't hide suggestions if clicking on them
                      if (!e.relatedTarget?.closest('#search-suggestions')) {
                        setTimeout(() => setShowSuggestions(false), 200);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (!showSuggestions) return;

                      switch (e.key) {
                        case 'ArrowDown':
                          e.preventDefault();
                          setSelectedSuggestionIndex(prev =>
                            prev < searchSuggestions.length - 1 ? prev + 1 : 0
                          );
                          break;
                        case 'ArrowUp':
                          e.preventDefault();
                          setSelectedSuggestionIndex(prev =>
                            prev > 0 ? prev - 1 : searchSuggestions.length - 1
                          );
                          break;
                        case 'Enter':
                          if (selectedSuggestionIndex >= 0 && searchSuggestions[selectedSuggestionIndex]) {
                            e.preventDefault();
                            const suggestion = searchSuggestions[selectedSuggestionIndex];
                            handleSearchChange(suggestion.name);
                            setShowSuggestions(false);
                            setSelectedSuggestionIndex(-1);
                          }
                          break;
                        case 'Escape':
                          setShowSuggestions(false);
                          setSelectedSuggestionIndex(-1);
                          break;
                        default:
                          // Allow other key events to proceed normally
                          break;
                      }
                    }}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    aria-label="Search for cards by name, set, or number"
                    aria-describedby={showSuggestions ? "search-suggestions" : undefined}
                    aria-expanded={showSuggestions}
                    aria-controls={showSuggestions ? "search-suggestions" : undefined}
                    aria-activedescendant={selectedSuggestionIndex >= 0 ? `suggestion-${selectedSuggestionIndex}` : undefined}
                    role="combobox"
                  />
                </div>

                {/* Autocomplete suggestions */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div
                    id="search-suggestions"
                    className="absolute top-full left-0 right-0 bg-white border border-slate-300 rounded-lg mt-1 shadow-lg z-50 max-h-48 overflow-y-auto"
                    role="listbox"
                  >
                    {searchSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        id={`suggestion-${idx}`}
                        className={`w-full px-3 py-2 text-left hover:bg-slate-50 focus:bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none flex items-center gap-2 border-b last:border-b-0 ${
                          selectedSuggestionIndex === idx ? 'bg-blue-50' : ''
                        }`}
                        onMouseDown={() => {
                          // Use onMouseDown instead of onClick to prevent blur issues
                          handleSearchChange(suggestion.name);
                          setShowSuggestions(false);
                          setSelectedSuggestionIndex(-1);
                        }}
                        onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                        role="option"
                        aria-selected={selectedSuggestionIndex === idx}
                        aria-label={`Select ${suggestion.name} from ${suggestion.set_name}`}
                      >
                        <img
                          src={suggestion.image_url}
                          alt=""
                          className="w-6 h-8 object-contain rounded"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div>
                          <div className="text-xs font-medium">
                            {highlightMatch(suggestion.name, searchTerm)}
                          </div>
                          <div className="text-xs text-slate-600">{suggestion.set_name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Game Filter - Dropdown Style */}
              <div className="mb-6">
                <label htmlFor="game-filter" className="block text-sm font-medium text-slate-700 mb-2">Game</label>
                <select
                  id="game-filter"
                  value={selectedGame}
                  onChange={(e) => handleGameChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                >
                  <option value="all">All Games</option>
                  {games.map(game => (
                    <option key={game.id} value={game.name}>{game.name}</option>
                  ))}
                </select>
              </div>

              {/* Set Filter - Dynamic based on selected game */}
              <div className="mb-6">
                <label htmlFor="set-filter" className="block text-sm font-medium text-slate-700 mb-2">Set</label>
                <select
                  id="set-filter"
                  value={filters.set}
                  onChange={(e) => handleFilterChange('set', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-slate-50 disabled:text-slate-500 text-sm"
                  disabled={selectedGame === 'all'}
                  aria-describedby={selectedGame === 'all' ? "set-help-text" : undefined}
                  aria-label={`Filter by card set${selectedGame !== 'all' ? `, currently ${availableSets.length} sets available` : ' (select a game first)'}`}
                >
                  <option value="all">All Sets</option>
                  {availableSets.map(set => (
                    <option key={set.id} value={set.name}>{set.name}</option>
                  ))}
                </select>
                {selectedGame === 'all' && (
                  <p id="set-help-text" className="text-xs text-slate-500 mt-1">Select a game to filter by set</p>
                )}
              </div>

              {/* Other Filters */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="rarity-filter" className="block text-sm font-medium text-slate-700 mb-2">Rarity</label>
                  <select
                    id="rarity-filter"
                    value={filters.rarity}
                    onChange={(e) => handleFilterChange('rarity', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    aria-label={`Filter by card rarity, ${Object.keys(filterCounts.rarities || {}).length} rarity types available`}
                  >
                    <option value="all">All Rarities</option>
                    <optgroup label="⚪ Common">
                      {filterOptions.rarities.filter(rarity =>
                        rarity.toLowerCase().includes('common') || rarity.toLowerCase().includes('basic')
                      ).map(rarity => (
                        <option key={rarity} value={rarity}>
                          {rarity} {getCount('rarities', rarity)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🟢 Uncommon">
                      {filterOptions.rarities.filter(rarity =>
                        rarity.toLowerCase().includes('uncommon')
                      ).map(rarity => (
                        <option key={rarity} value={rarity}>
                          {rarity} {getCount('rarities', rarity)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🟡 Rare">
                      {filterOptions.rarities.filter(rarity =>
                        rarity.toLowerCase().includes('rare') && !rarity.toLowerCase().includes('mythic')
                      ).map(rarity => (
                        <option key={rarity} value={rarity}>
                          {rarity} {getCount('rarities', rarity)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🔴 Mythic & Special">
                      {filterOptions.rarities.filter(rarity =>
                        rarity.toLowerCase().includes('mythic') ||
                        rarity.toLowerCase().includes('legendary') ||
                        rarity.toLowerCase().includes('special')
                      ).map(rarity => (
                        <option key={rarity} value={rarity}>
                          {rarity} {getCount('rarities', rarity)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="📦 Other">
                      {filterOptions.rarities.filter(rarity =>
                        !rarity.toLowerCase().includes('common') &&
                        !rarity.toLowerCase().includes('basic') &&
                        !rarity.toLowerCase().includes('uncommon') &&
                        !rarity.toLowerCase().includes('rare') &&
                        !rarity.toLowerCase().includes('mythic') &&
                        !rarity.toLowerCase().includes('legendary') &&
                        !rarity.toLowerCase().includes('special')
                      ).map(rarity => (
                        <option key={rarity} value={rarity}>
                          {rarity} {getCount('rarities', rarity)}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Condition</label>
                  <select
                    value={filters.quality}
                    onChange={(e) => handleFilterChange('quality', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Conditions</option>
                    {filterOptions.qualities.map(quality => (
                      <option key={quality} value={quality}>
                        {quality} {getCount('qualities', quality)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="foil-filter" className="block text-sm font-medium text-slate-700 mb-2">Foil Type</label>
                  <select
                    id="foil-filter"
                    value={filters.foilType}
                    onChange={(e) => handleFilterChange('foilType', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    aria-label={`Filter by foil type, ${filterOptions.foilTypes.length} foil type options available`}
                  >
                    <option value="all">All Foil Types</option>
                    {filterOptions.foilTypes.map(foilType => (
                      <option key={foilType} value={foilType}>
                        {foilType} {getCount('foilTypes', foilType === 'Foil' ? 'foil' : 'non-foil')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Price Range ({currency.symbol})</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      id="min-price-filter"
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                      aria-label={`Minimum price filter in ${currency.code}`}
                    />
                    <input
                      id="max-price-filter"
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                      aria-label={`Maximum price filter in ${currency.code}`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="sort-filter" className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
                  <div className="flex gap-2">
                    <select
                      id="sort-filter"
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      aria-label="Sort cards by different criteria"
                    >
                      <optgroup label="📝 Basic">
                        <option value="name">Name</option>
                        <option value="set">Set</option>
                        <option value="updated">Recently Updated</option>
                      </optgroup>
                      <optgroup label="💎 Rarity">
                        <option value="rarity">By Rarity</option>
                      </optgroup>
                      <optgroup label="💰 Price">
                        <option value="price">By Price</option>
                        <option value="price_low">Price: Low to High</option>
                        <option value="price_high">Price: High to Low</option>
                      </optgroup>
                    </select>
                    <button
                      onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                    >
                      {filters.sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center mb-4">
              <div className="flex-1 pr-4">
                <p className="text-slate-600" aria-live="polite">
                  <span className="font-medium">{cards.length}</span> cards found
                </p>
              </div>

              {/* View Toggle - Absolutely Fixed Position */}
              <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: '140px', width: '140px' }}>
                <span className="text-sm text-slate-600 hidden sm:inline" style={{ width: '36px' }}>View:</span>
                <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5" style={{ width: '96px' }}>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 rounded-md transition-colors motion-reduce:transition-none ${
                      viewMode === 'grid'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                    style={{ width: '44px', minWidth: '44px' }}
                    aria-pressed={viewMode === 'grid'}
                    aria-label="Switch to grid view"
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 rounded-md transition-colors motion-reduce:transition-none ${
                      viewMode === 'list'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                    style={{ width: '44px', minWidth: '44px' }}
                    aria-pressed={viewMode === 'list'}
                    aria-label="Switch to list view"
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filter Badges */}
            {activeFilters.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-600 font-medium">Active filters:</span>
                {activeFilters.map((filter) => (
                  <span
                    key={filter.key}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-900 rounded-full text-sm"
                  >
                    <span>{filter.displayName}: {filter.displayValue}</span>
                    <button
                      onClick={() => {
                        if (filter.key === 'search') {
                          handleSearchChange('');
                        } else if (filter.key === 'game') {
                          handleGameChange('all');
                        } else {
                          handleFilterChange(filter.key, '');
                        }
                      }}
                      className="ml-1 hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      aria-label={`Clear ${filter.displayName} filter`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {activeFilters.length > 1 && (
                  <button
                    onClick={clearAllFilters}
                    className="px-3 py-1 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    Clear All
                  </button>
                )}
              </div>
            )}

            {/* Conditional Rendering Based on View Mode */}
            <div className={`w-full ${viewMode === 'list' ? 'max-w-6xl mx-auto' : ''}`}>
              {viewMode === 'grid' ? (
                /* Grid View */
                cards.length > VIRTUAL_SCROLL_CONFIG.INITIAL_BATCH_SIZE ? (
                  /* Virtual Scrolling for large datasets (100+ cards) */
                  <ErrorBoundary>
                    <Suspense
                      fallback={
                        <div className="text-center py-8">
                          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-slate-600 text-sm">Loading virtual scrolling...</p>
                        </div>
                      }
                    >
                      <VirtualCardGrid
                        cards={cards}
                        CardComponent={({ card }) => {
                          const selectedVariationKey = selectedVariations[card.id] || card.variations[0]?.variation_key;
                          const selectedVariation = card.variations.find(v => v.variation_key === selectedVariationKey) || card.variations[0];

                          return (
                            <CardItem
                              card={card}
                              selectedVariationKey={selectedVariationKey}
                              selectedVariation={selectedVariation}
                              currency={currency}
                              onVariationChange={handleVariationChange(card.id)}
                              onAddToCart={handleAddToCart(card, selectedVariation)}
                            />
                          );
                        }}
                        cardHeight={500}    // Increased for vertical card layout on desktop
                        containerHeight={800}
                        enableProgressiveLoading={cards.length > 500}
                      />
                    </Suspense>
                  </ErrorBoundary>
                ) : (
                  /* Standard Grid for smaller datasets (< 100 cards) with sections */
                  <div>
                    {groupedCards.map((group, groupIndex) => (
                      <div key={groupIndex} className="mb-8">
                        {/* Section Header positioned above the grid, not inside it */}
                        {group.section && (
                          <SectionHeader title={group.section} count={group.cards.length} isGrid={true} />
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                          {group.cards.map(card => {
                            const selectedVariationKey = selectedVariations[card.id] || card.variations[0]?.variation_key;
                            const selectedVariation = card.variations.find(v => v.variation_key === selectedVariationKey) || card.variations[0];

                            return (
                              <CardItem
                                key={card.id}
                                card={card}
                                selectedVariationKey={selectedVariationKey}
                                selectedVariation={selectedVariation}
                                currency={currency}
                                onVariationChange={handleVariationChange(card.id)}
                                onAddToCart={handleAddToCart(card, selectedVariation)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* List View */
                <div>
                  {groupedCards.map((group, groupIndex) => (
                    <div key={groupIndex} className="mb-8">
                      {/* Section Header positioned above the list, ensuring proper styling */}
                      {group.section && (
                        <SectionHeader title={group.section} count={group.cards.length} isGrid={false} />
                      )}
                      <div className="space-y-2">
                        {group.cards.map(card => {
                          const selectedVariationKey = selectedVariations[card.id] || card.variations[0]?.variation_key;
                          const selectedVariation = card.variations.find(v => v.variation_key === selectedVariationKey) || card.variations[0];

                          return (
                            <ListCardItem
                              key={card.id}
                              card={card}
                              selectedVariationKey={selectedVariationKey}
                              selectedVariation={selectedVariation}
                              currency={currency}
                              onVariationChange={handleVariationChange(card.id)}
                              onAddToCart={handleAddToCart(card, selectedVariation)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cards.length === 0 && !loading && (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                <p className="text-slate-700 text-lg">No cards found matching your search</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Filter Modal */}
        {showMobileFilters && (
          <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setShowMobileFilters(false)}>
            <div
              ref={mobileFiltersRef}
              className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl overflow-y-auto"
              style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-filters-title"
            >
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 id="mobile-filters-title" className="text-xl font-bold">Filters</h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                  aria-label="Close filters panel"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                {/* Mobile search */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="search"
                      placeholder="Card name, set, number..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      aria-label="Search for cards by name, set, or number"
                    />
                  </div>
                </div>

                {/* Mobile filters - same as desktop sidebar */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="mobile-game-filter" className="block text-sm font-medium text-slate-700 mb-2">Game</label>
                    <select
                      id="mobile-game-filter"
                      value={selectedGame}
                      onChange={(e) => handleGameChange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      aria-label={`Filter by game, ${games.length} games available`}
                    >
                      <option value="all">All Games</option>
                      {games.map(game => (
                        <option key={game.id} value={game.name}>{game.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Set</label>
                    <select
                      value={filters.set}
                      onChange={(e) => handleFilterChange('set', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                      disabled={selectedGame === 'all'}
                    >
                      <option value="all">All Sets</option>
                      {availableSets.map(set => (
                        <option key={set.id} value={set.name}>{set.name}</option>
                      ))}
                    </select>
                    {selectedGame === 'all' && (
                      <p className="text-xs text-slate-500 mt-1">Select a game to filter by set</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Rarity</label>
                    <select
                      value={filters.rarity}
                      onChange={(e) => handleFilterChange('rarity', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Rarities</option>
                      <optgroup label="⚪ Common">
                        {filterOptions.rarities.filter(rarity =>
                          rarity.toLowerCase().includes('common') || rarity.toLowerCase().includes('basic')
                        ).map(rarity => (
                          <option key={rarity} value={rarity}>
                            {rarity} {getCount('rarities', rarity)}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🟢 Uncommon">
                        {filterOptions.rarities.filter(rarity =>
                          rarity.toLowerCase().includes('uncommon')
                        ).map(rarity => (
                          <option key={rarity} value={rarity}>
                            {rarity} {getCount('rarities', rarity)}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🟡 Rare">
                        {filterOptions.rarities.filter(rarity =>
                          rarity.toLowerCase().includes('rare') && !rarity.toLowerCase().includes('mythic')
                        ).map(rarity => (
                          <option key={rarity} value={rarity}>
                            {rarity} {getCount('rarities', rarity)}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🔴 Mythic & Special">
                        {filterOptions.rarities.filter(rarity =>
                          rarity.toLowerCase().includes('mythic') ||
                          rarity.toLowerCase().includes('legendary') ||
                          rarity.toLowerCase().includes('special')
                        ).map(rarity => (
                          <option key={rarity} value={rarity}>
                            {rarity} {getCount('rarities', rarity)}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="📦 Other">
                        {filterOptions.rarities.filter(rarity =>
                          !rarity.toLowerCase().includes('common') &&
                          !rarity.toLowerCase().includes('basic') &&
                          !rarity.toLowerCase().includes('uncommon') &&
                          !rarity.toLowerCase().includes('rare') &&
                          !rarity.toLowerCase().includes('mythic') &&
                          !rarity.toLowerCase().includes('legendary') &&
                          !rarity.toLowerCase().includes('special')
                        ).map(rarity => (
                          <option key={rarity} value={rarity}>
                            {rarity} {getCount('rarities', rarity)}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="condition-filter" className="block text-sm font-medium text-slate-700 mb-2">Condition</label>
                    <select
                      id="condition-filter"
                      value={filters.quality}
                      onChange={(e) => handleFilterChange('quality', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      aria-label={`Filter by card condition, ${filterOptions.qualities.length} condition types available`}
                    >
                      <option value="all">All Conditions</option>
                      {filterOptions.qualities.map(quality => (
                        <option key={quality} value={quality}>
                          {quality} {getCount('qualities', quality)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <fieldset>
                      <legend className="block text-sm font-medium text-slate-700 mb-2">Price Range ({currency.symbol})</legend>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          id="min-price"
                          type="number"
                          placeholder="Min"
                          value={filters.minPrice}
                          onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          step="0.01"
                          min="0"
                          aria-label={`Minimum price filter in ${currency.symbol}`}
                        />
                        <input
                          id="max-price"
                          type="number"
                          placeholder="Max"
                          value={filters.maxPrice}
                          onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          step="0.01"
                          min="0"
                          aria-label={`Maximum price filter in ${currency.symbol}`}
                        />
                      </div>
                    </fieldset>
                  </div>

                  <div>
                    <label htmlFor="sort-by" className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
                    <div className="flex gap-2">
                      <select
                        id="sort-by"
                        value={filters.sortBy}
                        onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        aria-label="Choose sorting method for cards"
                      >
                        <optgroup label="📝 Basic">
                          <option value="name">Name</option>
                          <option value="set">Set</option>
                          <option value="updated">Recently Updated</option>
                        </optgroup>
                        <optgroup label="💎 Rarity">
                          <option value="rarity">By Rarity</option>
                        </optgroup>
                        <optgroup label="💰 Price">
                          <option value="price">By Price</option>
                          <option value="price_low">Price: Low to High</option>
                          <option value="price_high">Price: High to Low</option>
                        </optgroup>
                      </select>
                      <button
                        onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label={`Sort ${filters.sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                        title={`Currently sorting ${filters.sortOrder === 'asc' ? 'ascending' : 'descending'}. Click to reverse.`}
                      >
                        {filters.sortOrder === 'asc' ? '↑' : '↓'}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="w-full mt-6 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors motion-reduce:transition-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Persistent Mini Cart */}
      {showMiniCart && cart.length > 0 && !showCart && (
        <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-40 max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-900">Cart ({cartCount})</h3>
            <button
              onClick={() => setShowMiniCart(false)}
              className="text-slate-400 hover:text-slate-600 focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none rounded"
              aria-label="Close mini cart"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {cart.slice(0, 3).map((item, idx) => (
              <div key={`${item.id}-${item.quality}`} className="flex items-center gap-2 text-sm">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-8 h-10 object-contain rounded"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{item.name}</div>
                  <div className="text-xs text-slate-600">
                    <div className="truncate">{item.set_name} #{item.card_number}</div>
                    <div>{item.quality} × {item.quantity}</div>
                    {item.foil_type && item.foil_type !== 'Regular' && (
                      <div className="text-yellow-600">✨ {item.foil_type}</div>
                    )}
                    {item.language && item.language !== 'English' && (
                      <div>{item.language}</div>
                    )}
                  </div>
                </div>
                <div className="font-semibold text-blue-600">
                  {currency.symbol}{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
            {cart.length > 3 && (
              <div className="text-xs text-slate-600 text-center">
                ...and {cart.length - 3} more items
              </div>
            )}
          </div>

          <div className="border-t mt-3 pt-3">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">Total:</span>
              <span className="font-bold text-lg text-blue-600">
                {currency.symbol}{cartTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCart(true)}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors motion-reduce:transition-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
              >
                View Cart
              </button>
              <button
                onClick={() => setShowMiniCart(false)}
                className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCart(false)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-md min-w-0 bg-white shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 sm:px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold">Cart</h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-slate-100 rounded-lg focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                aria-label="Close cart"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-700">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={`${item.id}-${item.quality}`} className="flex gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-20 h-28 object-contain rounded bg-white"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="112"%3E%3Crect fill="%231e293b" width="80" height="112"/%3E%3C/svg%3E';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm mb-1 line-clamp-2">{item.name}</h3>
                        <div className="text-xs text-slate-600 mb-2 space-y-1">
                          <div className="font-medium">{item.game_name}</div>
                          <div>{item.set_name} #{item.card_number}</div>
                          <div>{item.quality}</div>
                          {item.foil_type && item.foil_type !== 'Regular' && (
                            <div className="flex items-center gap-1">
                              <span>✨</span>
                              <span className="font-medium text-yellow-600">{item.foil_type}</span>
                            </div>
                          )}
                          {item.language && item.language !== 'English' && (
                            <div className="font-medium text-slate-700">{item.language}</div>
                          )}
                        </div>
                        <p className="text-sm font-bold text-blue-600 mb-3">{currency.symbol}{item.price.toFixed(2)}</p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateCartQuantity(item.id, item.quality, -1)}
                              className="p-1.5 bg-white border rounded hover:bg-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              aria-label={`Decrease quantity of ${item.name}`}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(item.id, item.quality, 1)}
                              disabled={item.quantity >= item.stock}
                              className="p-1.5 bg-white border rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              aria-label={`Increase quantity of ${item.name}`}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id, item.quality)}
                            className="ml-auto text-red-600 hover:text-red-700 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none rounded px-2 py-1"
                            aria-label={`Remove ${item.name} from cart`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t px-6 py-4 bg-slate-50">
                <div className="flex justify-between mb-4">
                  <span className="text-lg font-medium">Total:</span>
                  <span className="text-3xl font-bold text-blue-600">{currency.symbol}{cartTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleCheckoutClick}
                  className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors motion-reduce:transition-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cart Notifications */}
      {cartNotifications.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {cartNotifications.map(notification => (
            <div
              key={notification.id}
              className={`px-4 py-3 rounded-lg shadow-lg ${
                notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                notification.type === 'warning' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                'bg-blue-50 border-blue-200 text-blue-800'
              } border`}
              role={notification.type === 'error' ? 'alert' : 'status'}
              aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
              aria-atomic="true"
            >
              {notification.message}
            </div>
          ))}
        </div>
      )}

      {/* ARIA Live Regions for Screen Reader Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {groupedCards.length > 0 && (
          `Showing ${groupedCards.reduce((total, group) => total + group.cards.length, 0)} cards`
        )}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {loading && "Loading cards..."}
        {error && `Error: ${error}`}
      </div>

      {/* Search Results Announcement */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        key={`search-${searchTerm}-${groupedCards.length}`}
      >
        {searchTerm && !loading && (
          groupedCards.length > 0
            ? `Found ${groupedCards.reduce((total, group) => total + group.cards.length, 0)} cards matching "${searchTerm}"`
            : `No cards found matching "${searchTerm}"`
        )}
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

    </div>
  );
};

export default TCGShop;
