import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import CardSearchBar from './CardSearchBar';
// @ts-expect-error TS(2307): Cannot find module '../hooks/useSearchFilters' or ... Remove this comment to see the full error message
import { useSearchFilters } from '../hooks/useSearchFilters';
import { ShoppingCart, X, Plus, Minus, Filter, ChevronDown, LayoutGrid, List } from 'lucide-react';
import CurrencySelector from './CurrencySelector';
import Checkout from './Checkout';
import { useFilterCounts } from '../hooks/useFilterCounts';
import { useEnhancedCart } from '../hooks/useEnhancedCart';
import ErrorBoundary from './ErrorBoundary';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import { API_URL } from '../config/api';
import { useErrorHandler, withRetry, throttledFetch } from '../services/errorHandler';
import { FILTER_CONFIG, VIRTUAL_SCROLL_CONFIG } from '../config/constants';
import CardSkeleton from './skeletons/CardSkeleton';
import SectionHeader from './common/SectionHeader';
import CardItem from './cards/CardItem';
import ListCardItem from './cards/ListCardItem';

// Lazy load VirtualCardGrid for code splitting
const VirtualCardGrid = React.lazy(() => import('./VirtualCardGrid'));

const TCGShop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get filter values from URL
  const searchTerm = searchParams.get('search') || '';
  const selectedGame = searchParams.get('game') || 'all';
  const selectedSet = searchParams.get('set') || 'all';
  const selectedTreatment = searchParams.get('treatment') || 'all';
  const selectedRarity = searchParams.get('rarity') || 'all';
  const selectedQuality = searchParams.get('quality') || 'all';
  const selectedFoilType = searchParams.get('foilType') || 'all';

  const {
   games,
   sets,
   filterOptions,
   loading: filtersLoading,
   error: filtersError
  } = useSearchFilters(API_URL, selectedGame);

  // local loading/error for cards list fetch
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState(null);

  // Handler to update URL params
  const updateParam = useCallback((key: any, value: any) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value && value !== 'all') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      return newParams;
    });
  }, [setSearchParams]);

  // Search handlers
  const handleSearchChange = useCallback((value: any) => {
    updateParam('search', value);
  }, [updateParam]);

  const handleGameChange = useCallback((game: any) => {
    // When game changes, clear set filter
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (game && game !== 'all') {
        newParams.set('game', game);
      } else {
        newParams.delete('game');
      }
      newParams.delete('set'); // Clear set when game changes
      return newParams;
    });
  }, [setSearchParams]);

  const handleSetChange = useCallback((set: any) => {
    updateParam('set', set);
  }, [updateParam]);

  // Additional filters configuration
  const additionalFilters = {
    treatment: {
      value: selectedTreatment,
      onChange: (value: any) => updateParam('treatment', value),
      label: 'Treatment',
      options: filterOptions.treatments.map((t: any) => ({
        value: t.value,
        label: t.label,
        count: t.count
      }))
    },
    foilType: {
      value: selectedFoilType,
      onChange: (value: any) => updateParam('foilType', value),
      label: 'Foil Type',
      options: filterOptions.foilTypes.map((f: any) => ({
        value: f.value,
        label: f.label,
        count: f.count
      }))
    }
  };


  const [cards, setCards] = useState([]);
  // Create a stable handleError function to prevent unnecessary re-renders
  const errorHandler = useErrorHandler();
  const errorHandlerRef = useRef(errorHandler);
  errorHandlerRef.current = errorHandler; // Always keep ref up to date

  const handleError = useCallback((error: any, context: any) => {
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
  const showNotification = useCallback((message: any, type = 'info', duration = 5000) => {
    addNotification(message, type, duration);
  }, [addNotification]);


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

  // Currency and localization with toggle - Default to NZD for NZ-based shop
  const [currency, setCurrency] = useState({ symbol: 'NZ$', rate: 1.0, code: 'NZD' });

  const mobileFiltersRef = useRef(null);

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
      // @ts-expect-error TS(2339): Property 'id' does not exist on type 'never'.
      const currentCardIds = new Set(cards.map(card => card.id));

      // Keep only selections for cards that still exist
      const filteredSelections = {};
      Object.keys(prev).forEach(cardId => {
        if (currentCardIds.has(cardId)) {
          // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          filteredSelections[cardId] = prev[cardId];
        }
      });

      return filteredSelections;
    });
  }, [cards, searchTerm, selectedGame, filters]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: any) => {
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
            // @ts-expect-error TS(2339): Property 'focus' does not exist on type 'Element'.
            searchInput.focus();
            e.preventDefault();
          }
          break;
        case 'Escape':
          // Close any open modals/panels
          setShowKeyboardShortcuts(false);
          setShowCart(false);
          setShowMobileFilters(false);
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
      // @ts-expect-error TS(2339): Property 'querySelectorAll' does not exist on type... Remove this comment to see the full error message
      const focusableElements = mobileFiltersRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      // Handle tab key to trap focus within modal
      const handleTabKey = (e: any) => {
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

  // Fetch cards with current filters
  const fetchCards = useCallback(async () => {
    // Prevent multiple simultaneous card fetches
    if (requestInFlight.current.cards) {
      return;
    }

    try {
      requestInFlight.current.cards = true;
      // Set loading state to true when starting card fetch
      setCardsLoading(true);
      setCardsError(null);

      const queryParams = new URLSearchParams({
        limit: '100',
        search: searchTerm,
        sort_by: filters.sortBy,
        sort_order: filters.sortOrder
      });

      if (selectedGame !== 'all') {
        const selectedGameData = games.find((g: any) => g.name === selectedGame);
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
            // @ts-expect-error TS(2339): Property 'status' does not exist on type 'Error'.
            error.status = 429;
            throw error;
          }
          throw new Error('API request failed');
        }
        return cardsRes.json();
      }, 3, 1000);

      // Group cards by base card (consolidated variants)
      const groupedCards = {};
      cardsData.cards.forEach((item: any) => {
        const key = `${item.game_name}-${item.set_name}-${item.card_number}`;

        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        if (!groupedCards[key]) {
          // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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

        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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
      // @ts-expect-error TS(2345): Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
      setCardsError(`${formattedError.title}: ${formattedError.message} Try adjusting your filters or refreshing the page.`);
    } finally {
      // Always set loading to false when card fetch completes (success or error)
      setCardsLoading(false);
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
      // @ts-expect-error TS(2304): Cannot find name 'searchTimeoutRef'.
      if (searchTimeoutRef.current) {
        // @ts-expect-error TS(2304): Cannot find name 'searchTimeoutRef'.
        clearTimeout(searchTimeoutRef.current);
      }

      // Cancel any ongoing requests
      // @ts-expect-error TS(2552): Cannot find name 'abortController'. Did you mean '... Remove this comment to see the full error message
      if (abortController.current) {
        // @ts-expect-error TS(2552): Cannot find name 'abortController'. Did you mean '... Remove this comment to see the full error message
        abortController.current.abort();
      }
    };
  }, []); // Empty dependency array means this runs only on unmount

   // Handle filter changes with URL state management
  const handleFilterChange = useCallback((key: any, value: any) => {
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
  const getGameIdFromName = (gameName: any) => {
    const gameMap = {
      'Magic: The Gathering': 1,
      'Pokemon': 2,
      'Yu-Gi-Oh!': 3
    };
    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    return gameMap[gameName] || null;
  };

  // Currency change function
  const handleCurrencyChange = (newCurrency: any) => {
    setCurrency(newCurrency);
  };

  // Show mini cart when items added
  useEffect(() => {
    if (cart.length > 0 && !showCart) {
      setShowMiniCart(true);
    }
  }, [cart, showCart]);

  // Update cart quantity function (wrapper for useEnhancedCart)
  const updateCartQuantity = useCallback((id: any, quality: any, delta: any) => {
    // @ts-expect-error TS(2339): Property 'id' does not exist on type 'never'.
    const existingItem = cart.find(item => item.id === id && item.quality === quality);
    if (existingItem) {
      // @ts-expect-error TS(2339): Property 'quantity' does not exist on type 'never'... Remove this comment to see the full error message
      const newQuantity = existingItem.quantity + delta;
      updateQuantity(id, quality, newQuantity);
    }
  }, [cart, updateQuantity]);

  // Memoized expensive calculations
  // @ts-expect-error TS(2339): Property 'price' does not exist on type 'never'.
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);
  // @ts-expect-error TS(2339): Property 'quantity' does not exist on type 'never'... Remove this comment to see the full error message
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
        // @ts-expect-error TS(2339): Property 'name' does not exist on type 'never'.
        const firstLetter = card.name.charAt(0).toUpperCase();
        sectionKey = firstLetter;
        sectionTitle = firstLetter;
      } else if (sortBy === 'set') {
        // @ts-expect-error TS(2339): Property 'set_name' does not exist on type 'never'... Remove this comment to see the full error message
        sectionKey = card.set_name;
        // @ts-expect-error TS(2339): Property 'set_name' does not exist on type 'never'... Remove this comment to see the full error message
        sectionTitle = card.set_name;
      } else if (sortBy === 'rarity') {
        // Group by rarity type
        // @ts-expect-error TS(2339): Property 'rarity' does not exist on type 'never'.
        const rarity = card.rarity || 'Unknown';
        sectionKey = rarity;
        sectionTitle = rarity;
      } else if (['price', 'price_low', 'price_high'].includes(sortBy)) {
        // Group by price ranges
        // @ts-expect-error TS(2339): Property 'variations' does not exist on type 'neve... Remove this comment to see the full error message
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
        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        return (rarityOrder[a.section] || 6) - (rarityOrder[b.section] || 6);
      } else if (['price', 'price_low', 'price_high'].includes(sortBy)) {
        // Sort price ranges numerically
        const priceOrder = {
          'Under $1': 1, '$1 - $4.99': 2, '$5 - $9.99': 3, '$10 - $24.99': 4,
          '$25 - $49.99': 5, '$50 - $99.99': 6, '$100+': 7
        };
        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        const aOrder = priceOrder[a.section] || 8;
        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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
      group.cards.sort((a: any, b: any) => a.name.localeCompare(b.name));
    });

    return sortedGroups;
  }, [cards, filters]);

  // Memoized card handlers
  const handleVariationChange = useCallback((cardId: any) => (e: any) => {
    setSelectedVariations(prev => ({
      ...prev,
      [cardId]: e.target.value
    }));
  }, []);

  const handleAddToCart = useCallback((card: any, selectedVariation: any) => () => {
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

  const handleOrderSubmit = useCallback(async (orderData: any) => {
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

  if (filtersLoading || cardsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-mm-cream to-mm-tealLight">
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-mm-gold focus:text-white focus:rounded-lg focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
        >
          Skip to main content
        </a>

        {/* Skeleton Header */}
        <header className="bg-white shadow-sm border-b border-mm-warmAccent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="h-8 bg-mm-warmAccent rounded w-32 animate-pulse"></div>
              <div className="flex items-center gap-4">
                <div className="h-6 bg-mm-warmAccent rounded w-24 animate-pulse"></div>
                <div className="h-10 bg-mm-warmAccent rounded w-10 animate-pulse"></div>
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
                  <div className="h-4 bg-mm-warmAccent rounded w-20 mb-3 animate-pulse"></div>
                  <div className="h-10 bg-mm-warmAccent rounded animate-pulse"></div>
                </div>
              ))}
            </aside>

            {/* Skeleton Cards Grid */}
            <div className="flex-1">
              <div className="mb-6">
                <div className="h-6 bg-mm-warmAccent rounded w-48 animate-pulse"></div>
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

  if (filtersError || cardsError) {
    return (
      <div className="min-h-screen bg-mm-cream flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-mm-darkForest mb-2">Connection Error</h2>
          <p className="text-mm-teal mb-4">{cardsError || filtersError}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-mm-primary"
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
    <div className="min-h-screen bg-gradient-to-br from-mm-cream to-mm-tealLight">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-mm-gold focus:text-white focus:rounded-lg focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
      >
        Skip to main content
      </a>
      {/* Offline indicator */}
      {isOffline && (
        <div className="bg-red-600 text-white text-center py-2 px-4 text-sm font-medium">
          ⚠️ You are offline. Some features may not work properly.
        </div>
      )}

      <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-mm-warmAccent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-mm-gold to-mm-tealBright bg-clip-text text-transparent">
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
                className="relative p-3 hover:bg-mm-tealLight rounded-lg transition-colors motion-reduce:transition-none focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
                aria-label={`Open shopping cart with ${cartCount} items`}
              >
                <ShoppingCart className="w-6 h-6 text-mm-forest" />
                <span
                  className={`absolute -top-1 -right-1 ${cartCount > 0 ? 'bg-mm-gold' : 'bg-mm-teal'} text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center`}
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
            className="btn-mm-secondary w-full"
            aria-label="Open filters and search panel"
            aria-expanded={showMobileFilters}
          >
            <Filter className="w-5 h-5 text-mm-teal" />
            <span className="font-medium text-mm-forest">Filters & Search</span>
            <ChevronDown className="w-4 h-4 text-mm-teal ml-auto" />
          </button>
        </div>

        {/* Desktop Layout with Sidebar */}
        <div className="lg:flex lg:gap-6">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="card-mm sticky top-24">
              <h2 className="text-lg font-semibold text-mm-darkForest mb-4">Search & Filters</h2>

              <CardSearchBar
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                selectedGame={selectedGame}
                onGameChange={handleGameChange}
                selectedSet={selectedSet}
                onSetChange={handleSetChange}
                games={games}
                sets={sets}
                additionalFilters={additionalFilters}
                apiUrl={API_URL}
                debounceMs={300}
                minSearchLength={2}
              />

            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center mb-4">
              <div className="flex-1 pr-4">
                <p className="text-mm-teal" aria-live="polite">
                  <span className="font-medium">{cards.length}</span> cards found
                </p>
              </div>

              {/* View Toggle - Absolutely Fixed Position */}
              <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: '140px', width: '140px' }}>
                <span className="text-sm text-mm-teal hidden sm:inline" style={{ width: '36px' }}>View:</span>
                <div className="inline-flex rounded-lg border border-mm-warmAccent bg-white p-0.5" style={{ width: '96px' }}>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 rounded-md transition-colors motion-reduce:transition-none ${
                      viewMode === 'grid'
                        ? 'bg-mm-gold text-white shadow-sm'
                        : 'text-mm-teal hover:text-mm-darkForest hover:bg-mm-tealLight'
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
                        ? 'bg-mm-gold text-white shadow-sm'
                        : 'text-mm-teal hover:text-mm-darkForest hover:bg-mm-tealLight'
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
                <span className="text-sm text-mm-teal font-medium">Active filters:</span>
                {activeFilters.map((filter) => (
                  <span
                    key={filter.key}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-mm-tealLight text-mm-tealBright rounded-full text-sm"
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
                      className="ml-1 hover:bg-mm-warmAccent rounded-full w-4 h-4 flex items-center justify-center focus:ring-2 focus:ring-mm-forest focus:outline-none"
                      aria-label={`Clear ${filter.displayName} filter`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {activeFilters.length > 1 && (
                  <button
                    onClick={clearAllFilters}
                    className="px-3 py-1 text-sm text-mm-teal hover:text-mm-darkForest hover:bg-mm-tealLight rounded-full border border-mm-warmAccent focus:ring-2 focus:ring-mm-forest focus:outline-none"
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
                          <div className="w-6 h-6 border-2 border-mm-gold border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-mm-teal text-sm">Loading virtual scrolling...</p>
                        </div>
                      }
                    >
                      <VirtualCardGrid
                        cards={cards}
                        CardComponent={({
                          card
                        }: any) => {
                          // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                          const selectedVariationKey = selectedVariations[card.id] || card.variations[0]?.variation_key;
                          const selectedVariation = card.variations.find((v: any) => v.variation_key === selectedVariationKey) || card.variations[0];

                          return (
                            <CardItem
                              // @ts-expect-error TS(2322): Type '{ card: any; selectedVariationKey: any; sele... Remove this comment to see the full error message
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
                          {group.cards.map((card: any) => {
                            // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                            const selectedVariationKey = selectedVariations[card.id] || card.variations[0]?.variation_key;
                            const selectedVariation = card.variations.find((v: any) => v.variation_key === selectedVariationKey) || card.variations[0];

                            return (
                              <CardItem
                                key={card.id}
                                // @ts-expect-error TS(2322): Type '{ key: any; card: any; selectedVariationKey:... Remove this comment to see the full error message
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
                        {group.cards.map((card: any) => {
                          // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                          const selectedVariationKey = selectedVariations[card.id] || card.variations[0]?.variation_key;
                          const selectedVariation = card.variations.find((v: any) => v.variation_key === selectedVariationKey) || card.variations[0];

                          return (
                            <ListCardItem
                              key={card.id}
                              // @ts-expect-error TS(2322): Type '{ key: any; card: any; selectedVariationKey:... Remove this comment to see the full error message
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

            // @ts-expect-error TS(2304): Cannot find name 'loading'.
            {cards.length === 0 && !loading && (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                <p className="text-mm-forest text-lg">No cards found matching your search</p>
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
                  className="p-2 hover:bg-mm-tealLight rounded-lg focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
                  aria-label="Close filters panel"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <CardSearchBar
                  searchTerm={searchTerm}
                  onSearchChange={handleSearchChange}
                  selectedGame={selectedGame}
                  onGameChange={handleGameChange}
                  selectedSet={selectedSet}
                  onSetChange={handleSetChange}
                  games={games}
                  sets={sets}
                  additionalFilters={additionalFilters}
                  apiUrl={API_URL}
                  debounceMs={300}
                  minSearchLength={2}
                />
                <div className="space-y-4 mt-6">
                  {/* Price Range (unchanged) */}
                  <div>
                    <fieldset>
                      <legend className="block text-sm font-medium text-mm-forest mb-2">
                        Price Range ({currency.symbol})
                      </legend>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          id="min-price"
                          type="number"
                          placeholder="Min"
                          value={filters.minPrice}
                          onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                          className="px-3 py-2 border border-mm-warmAccent rounded-lg text-sm focus:ring-2 focus:ring-mm-forest"
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
                          className="px-3 py-2 border border-mm-warmAccent rounded-lg text-sm focus:ring-2 focus:ring-mm-forest"
                          step="0.01"
                          min="0"
                          aria-label={`Maximum price filter in ${currency.symbol}`}
                        />
                      </div>
                    </fieldset>
                  </div>

                  {/* Sort By (unchanged) */}
                  <div>
                    <label htmlFor="sort-by" className="block text-sm font-medium text-mm-forest mb-2">
                      Sort By
                    </label>
                    <div className="flex gap-2">
                      <select
                        id="sort-by"
                        value={filters.sortBy}
                        onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                        className="flex-1 px-3 py-2 border border-mm-warmAccent rounded-lg text-sm focus:ring-2 focus:ring-mm-forest"
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
                        className="px-3 py-2 border border-mm-warmAccent rounded-lg text-sm hover:bg-mm-tealLight focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label={`Sort ${filters.sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                        title={`Currently sorting ${filters.sortOrder === 'asc' ? 'ascending' : 'descending'}. Click to reverse.`}
                      >
                        {filters.sortOrder === 'asc' ? '↑' : '↓'}
                      </button>
                    </div>
                  </div>
                </div>

                <button onClick={() => setShowMobileFilters(false)} className="btn-mm-primary w-full mt-6">
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Persistent Mini Cart */}
      {showMiniCart && cart.length > 0 && !showCart && (
        <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-lg border border-mm-warmAccent p-4 z-40 max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-mm-darkForest">Cart ({cartCount})</h3>
            <button
              onClick={() => setShowMiniCart(false)}
              className="text-mm-teal hover:text-mm-teal focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none rounded"
              aria-label="Close mini cart"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {cart.slice(0, 3).map((item, idx) => (
              // @ts-expect-error TS(2339): Property 'id' does not exist on type 'never'.
              <div key={`${item.id}-${item.quality}`} className="flex items-center gap-2 text-sm">
                <img
                  // @ts-expect-error TS(2339): Property 'image_url' does not exist on type 'never... Remove this comment to see the full error message
                  src={item.image_url}
                  // @ts-expect-error TS(2339): Property 'name' does not exist on type 'never'.
                  alt={item.name}
                  className="w-8 h-10 object-contain rounded"
                  onError={(e) => {
                    // @ts-expect-error TS(2339): Property 'style' does not exist on type 'EventTarg... Remove this comment to see the full error message
                    e.target.style.display = 'none';
                  }}
                />
                <div className="flex-1 min-w-0">
                  // @ts-expect-error TS(2339): Property 'name' does not exist on type 'never'.
                  <div className="truncate font-medium">{item.name}</div>
                  <div className="text-xs text-mm-teal">
                    // @ts-expect-error TS(2339): Property 'set_name' does not exist on type 'never'... Remove this comment to see the full error message
                    <div className="truncate">{item.set_name} #{item.card_number}</div>
                    // @ts-expect-error TS(2339): Property 'quality' does not exist on type 'never'.
                    <div>{item.quality} × {item.quantity}</div>
                    // @ts-expect-error TS(2339): Property 'foil_type' does not exist on type 'never... Remove this comment to see the full error message
                    {item.foil_type && item.foil_type !== 'Regular' && (
                      // @ts-expect-error TS(2339): Property 'foil_type' does not exist on type 'never... Remove this comment to see the full error message
                      <div className="text-yellow-600">✨ {item.foil_type}</div>
                    )}
                    // @ts-expect-error TS(2339): Property 'language' does not exist on type 'never'... Remove this comment to see the full error message
                    {item.language && item.language !== 'English' && (
                      // @ts-expect-error TS(2339): Property 'language' does not exist on type 'never'... Remove this comment to see the full error message
                      <div>{item.language}</div>
                    )}
                  </div>
                </div>
                <div className="font-semibold text-mm-tealBright">
                  // @ts-expect-error TS(2339): Property 'price' does not exist on type 'never'.
                  {currency.symbol}{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
            {cart.length > 3 && (
              <div className="text-xs text-mm-teal text-center">
                ...and {cart.length - 3} more items
              </div>
            )}
          </div>

          <div className="border-t mt-3 pt-3">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">Total:</span>
              <span className="font-bold text-lg text-mm-tealBright">
                {currency.symbol}{cartTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCart(true)}
                className="btn-mm-primary flex-1 text-sm"
              >
                View Cart
              </button>
              <button
                onClick={() => setShowMiniCart(false)}
                className="btn-mm-secondary text-sm"
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
                className="p-2 hover:bg-mm-tealLight rounded-lg focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
                aria-label="Close cart"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-mm-teal mx-auto mb-4" />
                  <p className="text-mm-forest">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    // @ts-expect-error TS(2339): Property 'id' does not exist on type 'never'.
                    <div key={`${item.id}-${item.quality}`} className="flex gap-4 p-4 bg-mm-tealLight rounded-lg border border-mm-warmAccent">
                      <img
                        // @ts-expect-error TS(2339): Property 'image_url' does not exist on type 'never... Remove this comment to see the full error message
                        src={item.image_url}
                        // @ts-expect-error TS(2339): Property 'name' does not exist on type 'never'.
                        alt={item.name}
                        className="w-20 h-28 object-contain rounded bg-white"
                        onError={(e) => {
                          // @ts-expect-error TS(2339): Property 'onerror' does not exist on type 'EventTa... Remove this comment to see the full error message
                          e.target.onerror = null;
                          // @ts-expect-error TS(2339): Property 'src' does not exist on type 'EventTarget... Remove this comment to see the full error message
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="112"%3E%3Crect fill="%231e293b" width="80" height="112"/%3E%3C/svg%3E';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        // @ts-expect-error TS(2339): Property 'name' does not exist on type 'never'.
                        <h3 className="font-bold text-sm mb-1 line-clamp-2">{item.name}</h3>
                        <div className="text-xs text-mm-teal mb-2 space-y-1">
                          // @ts-expect-error TS(2339): Property 'game_name' does not exist on type 'never... Remove this comment to see the full error message
                          <div className="font-medium">{item.game_name}</div>
                          // @ts-expect-error TS(2339): Property 'set_name' does not exist on type 'never'... Remove this comment to see the full error message
                          <div>{item.set_name} #{item.card_number}</div>
                          // @ts-expect-error TS(2339): Property 'quality' does not exist on type 'never'.
                          <div>{item.quality}</div>
                          // @ts-expect-error TS(2339): Property 'foil_type' does not exist on type 'never... Remove this comment to see the full error message
                          {item.foil_type && item.foil_type !== 'Regular' && (
                            <div className="flex items-center gap-1">
                              <span>✨</span>
                              // @ts-expect-error TS(2339): Property 'foil_type' does not exist on type 'never... Remove this comment to see the full error message
                              <span className="font-medium text-yellow-600">{item.foil_type}</span>
                            </div>
                          )}
                          // @ts-expect-error TS(2339): Property 'language' does not exist on type 'never'... Remove this comment to see the full error message
                          {item.language && item.language !== 'English' && (
                            // @ts-expect-error TS(2339): Property 'language' does not exist on type 'never'... Remove this comment to see the full error message
                            <div className="font-medium text-mm-forest">{item.language}</div>
                          )}
                        </div>
                        // @ts-expect-error TS(2339): Property 'price' does not exist on type 'never'.
                        <p className="text-sm font-bold text-mm-tealBright mb-3">{currency.symbol}{item.price.toFixed(2)}</p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              // @ts-expect-error TS(2339): Property 'id' does not exist on type 'never'.
                              onClick={() => updateCartQuantity(item.id, item.quality, -1)}
                              className="p-1.5 bg-white border rounded hover:bg-mm-tealLight focus:ring-2 focus:ring-mm-forest focus:outline-none"
                              // @ts-expect-error TS(2339): Property 'name' does not exist on type 'never'.
                              aria-label={`Decrease quantity of ${item.name}`}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            // @ts-expect-error TS(2339): Property 'quantity' does not exist on type 'never'... Remove this comment to see the full error message
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button
                              // @ts-expect-error TS(2339): Property 'id' does not exist on type 'never'.
                              onClick={() => updateCartQuantity(item.id, item.quality, 1)}
                              // @ts-expect-error TS(2339): Property 'quantity' does not exist on type 'never'... Remove this comment to see the full error message
                              disabled={item.quantity >= item.stock}
                              className="p-1.5 bg-white border rounded hover:bg-mm-tealLight disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-mm-forest focus:outline-none"
                              // @ts-expect-error TS(2339): Property 'name' does not exist on type 'never'.
                              aria-label={`Increase quantity of ${item.name}`}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            // @ts-expect-error TS(2339): Property 'id' does not exist on type 'never'.
                            onClick={() => removeFromCart(item.id, item.quality)}
                            className="ml-auto text-red-600 hover:text-red-700 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none rounded px-2 py-1"
                            // @ts-expect-error TS(2339): Property 'name' does not exist on type 'never'.
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
              <div className="border-t px-6 py-4 bg-mm-tealLight">
                <div className="flex justify-between mb-4">
                  <span className="text-lg font-medium">Total:</span>
                  <span className="text-3xl font-bold text-mm-tealBright">{currency.symbol}{cartTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleCheckoutClick}
                  className="btn-mm-primary w-full"
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
              // @ts-expect-error TS(2339): Property 'id' does not exist on type 'never'.
              key={notification.id}
              className={`px-4 py-3 rounded-lg shadow-lg ${
                // @ts-expect-error TS(2339): Property 'type' does not exist on type 'never'.
                notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                // @ts-expect-error TS(2339): Property 'type' does not exist on type 'never'.
                notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                // @ts-expect-error TS(2339): Property 'type' does not exist on type 'never'.
                notification.type === 'warning' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                'bg-mm-tealLight border-mm-tealBright text-mm-tealBright'
              } border`}
              // @ts-expect-error TS(2339): Property 'type' does not exist on type 'never'.
              role={notification.type === 'error' ? 'alert' : 'status'}
              // @ts-expect-error TS(2339): Property 'type' does not exist on type 'never'.
              aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
              aria-atomic="true"
            >
              // @ts-expect-error TS(2339): Property 'message' does not exist on type 'never'.
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
        {(filtersLoading || cardsLoading) && "Loading cards..."}
        {(filtersError || cardsError) && `Error: ${cardsError || filtersError}`}
      </div>

      {/* Search Results Announcement */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        key={`search-${searchTerm}-${groupedCards.length}`}
      >
        // @ts-expect-error TS(2304): Cannot find name 'loading'.
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
