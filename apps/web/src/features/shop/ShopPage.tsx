// apps/web/src/components/TCGShop.tsx
// Complete overhaul - Phase 1 & 2 fixes - All functionality preserved
import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import CardSearchBar from './CardSearchBar';
import { useSearchFilters } from '../hooks/useSearchFilters';
import { ShoppingCart, X, Plus, Minus, Filter, ChevronDown, LayoutGrid, List } from 'lucide-react';
import CurrencySelector from './CurrencySelector';
import Checkout from './Checkout';
import { useEnhancedCart } from '../hooks/useEnhancedCart';
import ErrorBoundary from './ErrorBoundary';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import { useErrorHandler } from '../services/errorHandler';
import { VIRTUAL_SCROLL_CONFIG } from '../config/constants';
import CardSkeleton from './skeletons/CardSkeleton';
import SectionHeader from './common/SectionHeader';
import CardItem from './cards/CardItem';
import ListCardItem from './cards/ListCardItem';
import { API_BASE, api } from '@/config/api';
import type { 
  StorefrontCard,
  Currency
} from '@/types';

// Lazy load VirtualCardGrid for code splitting
const VirtualCardGrid = React.lazy(() => import('./VirtualCardGrid'));

// ============================================================================
// LOCAL TYPE DEFINITIONS (not exported elsewhere)
// ============================================================================

interface SelectedVariations {
  [cardId: number]: string; // variation_key
}

// Card type that matches CardItem/ListCardItem requirements
interface CardForDisplay {
  id: number;
  name: string;
  image_url: string; // Required by CardItem/ListCardItem
  set_name: string;
  card_number: string;
  game_name: string;
  rarity?: string;
  total_stock: number;
  variation_count: number;
  variations: Array<{
    variation_key: string;
    quality: string;
    foil_type: string;
    language?: string;
    price: number;
    stock: number;
    inventory_id: number;
  }>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TCGShop: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // ============================================================================
  // URL STATE
  // ============================================================================
  const searchTerm = searchParams.get('search') || '';
  const selectedGame = searchParams.get('game') || 'all';
  const selectedSet = searchParams.get('set') || 'all';
  const selectedTreatment = searchParams.get('treatment') || 'all';
  const selectedRarity = searchParams.get('rarity') || 'all';
  const selectedQuality = searchParams.get('quality') || 'all';
  const selectedFoilType = searchParams.get('foilType') || 'all';

  // ============================================================================
  // HOOKS
  // ============================================================================
  const {
    games,
    sets,
    filterOptions,
    loading: filtersLoading,
    error: filtersError
  } = useSearchFilters(API_BASE, selectedGame);

  const errorHandler = useErrorHandler();
  
  const {
    cart,
    cartNotifications,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    addNotification
  } = useEnhancedCart(API_BASE);

  // ============================================================================
  // LOCAL STATE - ALL PROPERLY DECLARED
  // ============================================================================
  const [cards, setCards] = useState<CardForDisplay[]>([]);

  // Group cards by card_number (same logic as admin)
  const groupedCardsFlat = useMemo(() => {
    const groups = new Map<string, CardForDisplay[]>(); 
    
    cards.forEach(card => {
      const key = `${card.set_name}-${card.card_number}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(card); 
    });
    
    // Merge cards with same card_number
    return Array.from(groups.values()).map(cardGroup => {
      if (cardGroup.length === 1) return cardGroup[0];
      
      // Merge multiple cards into one with combined variations
      const baseCard = cardGroup[0];
      const allVariations = cardGroup.flatMap(c => c.variations || []);
      
      return {
        ...baseCard,
        variations: allVariations,
        variation_count: allVariations.length,
        total_stock: allVariations.reduce((sum, v) => sum + (v.stock || 0), 0),
      };
    });
  }, [cards]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showCart, setShowCart] = useState(false);
  const [showMiniCart, setShowMiniCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  const [selectedVariations, setSelectedVariations] = useState<SelectedVariations>({});
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currency, setCurrency] = useState<Currency>({ symbol: 'NZ$', rate: 1.0, code: 'NZD' });

  // ============================================================================
  // REFS
  // ============================================================================
  const mobileFiltersRef = useRef<HTMLDivElement>(null);
  const requestInFlight = useRef({ cards: false });

  // ============================================================================
  // DERIVED STATE
  // ============================================================================
  const filters = useMemo(() => ({
    quality: selectedQuality,
    rarity: selectedRarity,
    foilType: selectedFoilType,
    language: searchParams.get('language') || 'English',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sortBy: searchParams.get('sortBy') || 'name',
    sortOrder: searchParams.get('sortOrder') || 'asc',
    set: selectedSet
  }), [searchParams, selectedQuality, selectedRarity, selectedFoilType, selectedSet]);

  const cartTotal = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), 
    [cart]
  );

  const cartCount = useMemo(() => 
    cart.reduce((sum, item) => sum + item.quantity, 0), 
    [cart]
  );

  // ============================================================================
  // URL PARAM HANDLERS
  // ============================================================================
  const updateParam = useCallback((key: string, value: string) => {
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

  const handleSearchChange = useCallback((value: string) => {
    updateParam('search', value);
  }, [updateParam]);

  const handleGameChange = useCallback((game: string) => {
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

  const handleSetChange = useCallback((set: string) => {
    updateParam('set', set);
  }, [updateParam]);

  const handleFilterChange = useCallback((key: string, value: string) => {
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

  const clearAllFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  // ============================================================================
  // ADDITIONAL FILTERS CONFIG
  // ============================================================================
  const additionalFilters = useMemo(() => ({
    treatment: {
      value: selectedTreatment,
      onChange: (value: string) => updateParam('treatment', value),
      label: 'Treatment',
      options: filterOptions.treatments.map(t => ({
        value: t.value,
        label: t.label,
        count: t.count
      }))
    },
    foilType: {
      value: selectedFoilType,
      onChange: (value: string) => updateParam('foilType', value),
      label: 'Foil Type',
      options: filterOptions.foilTypes.map(f => ({
        value: f.value,
        label: f.label,
        count: f.count
      }))
    }
  }), [selectedTreatment, selectedFoilType, filterOptions, updateParam]);

  // ============================================================================
  // ACTIVE FILTERS FOR DISPLAY
  // ============================================================================
  const activeFilters = useMemo(() => {
    const active: Array<{ key: string; displayName: string; displayValue: string }> = [];
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '' && value !== 'English') {
        let displayName = key;
        let displayValue = value;

        switch (key) {
          case 'foilType': 
            displayName = 'Foil'; 
            break;
          case 'minPrice': 
            displayName = 'Min Price'; 
            displayValue = `$${value}`; 
            break;
          case 'maxPrice': 
            displayName = 'Max Price'; 
            displayValue = `$${value}`; 
            break;
          case 'sortBy': 
            displayName = 'Sort'; 
            break;
          case 'sortOrder': 
            return; // Don't show sort order as separate filter
          default: 
            displayName = key.charAt(0).toUpperCase() + key.slice(1); 
            break;
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

  // ============================================================================
  // FETCH CARDS WITH PROPER GAME/SET RESOLUTION
  // ============================================================================
  
  // Transform StorefrontCard to CardForDisplay with proper type matching
  const transformCard = useCallback((card: StorefrontCard): CardForDisplay => ({
    id: card.id,
    name: card.name,
    image_url: card.image_url || '', // Provide fallback for required field
    set_name: card.set_name,
    card_number: card.card_number,
    game_name: card.game_name,
    rarity: card.rarity,
    total_stock: card.total_stock,
    variation_count: card.variation_count,
    variations: card.variations
  }), []);
  
  const fetchCards = useCallback(async () => {
    // Prevent duplicate requests
    if (requestInFlight.current.cards) return;
    requestInFlight.current.cards = true;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      // FIXED: Properly resolve game by matching name OR code OR case-insensitive
      if (selectedGame && selectedGame !== 'all') {
        const game = games.find(g => 
          g.name === selectedGame || 
          g.code === selectedGame ||
          g.name.toLowerCase() === selectedGame.toLowerCase()
        );
        
        if (game?.id) {
          params.append('game_id', String(game.id));
        }
      }

      // FIXED: Properly resolve set by matching name
      if (selectedSet && selectedSet !== 'all') {
        const set = sets.find(s => s.name === selectedSet);
        if (set?.id) {
          params.append('set_id', String(set.id));
        }
      }

      // Add search term
      if (searchTerm && searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      // Add treatment filter
      if (selectedTreatment && selectedTreatment !== 'all') {
        params.append('treatment', selectedTreatment);
      }

      // Add pagination
      params.append('page', '1');
      params.append('per_page', '100');
      params.append('sort', 'name');
      params.append('order', 'asc');

      // Use the storefront endpoint (api.get only takes 1 param)
      const response = await api.get<{ cards: StorefrontCard[] }>(
        `/storefront/cards?${params.toString()}`
      );

      // Transform cards to match CardForDisplay interface
      const transformedCards = (response.cards ?? []).map(transformCard);
      setCards(transformedCards);
    } catch (err: any) {
      console.error('Error fetching cards:', err);
      setError(err?.message ?? 'Failed to load cards');
      errorHandler.handleError(err, 'fetching cards');
    } finally {
      setLoading(false);
      requestInFlight.current.cards = false;
    }
  }, [selectedGame, selectedSet, searchTerm, selectedTreatment, games, sets, errorHandler, transformCard]);

  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Fetch cards when games are loaded or filters change
  useEffect(() => {
    if (games.length > 0) {
      fetchCards();
    }
  }, [fetchCards, games]);

  // Clear stale variation selections when cards change
  useEffect(() => {
    setSelectedVariations(prev => {
      const currentCardIds = new Set(cards.map(card => card.id));
      const filteredSelections: SelectedVariations = {};
      
      Object.keys(prev).forEach(cardIdStr => {
        const cardId = Number(cardIdStr);
        if (currentCardIds.has(cardId)) {
          filteredSelections[cardId] = prev[cardId];
        }
      });

      return filteredSelections;
    });
  }, [cards]);

  // Offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      addNotification('Connection restored', 'success', 3000);
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      addNotification('You are offline. Some features may not work.', 'warning', 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addNotification]);

  // Show mini cart when items added
  useEffect(() => {
    if (cart.length > 0 && !showCart) {
      setShowMiniCart(true);
    }
  }, [cart, showCart]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in inputs
      if ((e.target as HTMLElement).matches('input, textarea, select')) {
        if (e.key !== '?') return;
      }

      // Ctrl/Cmd + K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
        searchInput?.focus();
      }

      // ?: Show keyboard shortcuts
      if (e.key === '?') {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }

      // Escape: Close modals
      if (e.key === 'Escape') {
        if (showCart) setShowCart(false);
        else if (showMobileFilters) setShowMobileFilters(false);
        else if (showKeyboardShortcuts) setShowKeyboardShortcuts(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showCart, showMobileFilters, showKeyboardShortcuts]);

  // Focus management for mobile filters
  useEffect(() => {
    if (showMobileFilters && mobileFiltersRef.current) {
      const focusableElements = mobileFiltersRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
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

  // ============================================================================
  // CARD GROUPING AND SORTING - FIXED PRICE GROUPING
  // ============================================================================
  const groupedCards = useMemo(() => {
  if (!groupedCardsFlat.length) return [];
  
  const { sortBy } = filters;

  // If no grouping needed, return ungrouped
  if (!['name', 'set', 'rarity', 'price', 'price_low', 'price_high'].includes(sortBy)) {
    return [{ section: null, cards: groupedCardsFlat }]; 
  }

  const groups = new Map<string, CardForDisplay[]>();

  groupedCardsFlat.forEach(card => { // ← Changed from cards.forEach
    // ... rest of the code stays exactly the same
    let sectionKey: string;
    let sectionTitle: string;

    if (sortBy === 'name') {
      const firstLetter = card.name.charAt(0).toUpperCase();
      sectionKey = firstLetter;
      sectionTitle = firstLetter;
    } else if (sortBy === 'set') {
      sectionKey = card.set_name;
      sectionTitle = card.set_name;
    } else if (sortBy === 'rarity') {
      const rarity = card.rarity || 'Unknown';
      sectionKey = rarity;
      sectionTitle = rarity;
    } else if (['price', 'price_low', 'price_high'].includes(sortBy)) {
      const price = card.variations?.[0]?.price ?? 0;
      
      if (price < 1) {
        sectionKey = 'Under $1';
        sectionTitle = 'Under $1';
      } else if (price < 5) {
        sectionKey = '$1 - $4.99';
        sectionTitle = '$1 - $4.99';
      } else if (price < 10) {
        sectionKey = '$5 - $9.99';
        sectionTitle = '$5 - $9.99';
      } else if (price < 25) {
        sectionKey = '$10 - $24.99';
        sectionTitle = '$10 - $24.99';
      } else if (price < 50) {
        sectionKey = '$25 - $49.99';
        sectionTitle = '$25 - $49.99';
      } else if (price < 100) {
        sectionKey = '$50 - $99.99';
        sectionTitle = '$50 - $99.99';
      } else {
        sectionKey = '$100+';
        sectionTitle = '$100+';
      }
    } else {
      sectionKey = 'Other';
      sectionTitle = 'Other';
    }

    if (!groups.has(sectionKey)) {
      groups.set(sectionKey, []);
    }
    groups.get(sectionKey)!.push(card);
  });

    // Convert to array and sort groups
    const sortedGroups = Array.from(groups.entries()).map(([section, cards]) => ({
      section,
      cards
    }));

    // Sort the groups themselves
    sortedGroups.sort((a, b) => {
      if (sortBy === 'name' || sortBy === 'set' || sortBy === 'rarity') {
        return a.section.localeCompare(b.section);
      }
      
      if (['price', 'price_low', 'price_high'].includes(sortBy)) {
        const priceOrder: Record<string, number> = {
          'Under $1': 1,
          '$1 - $4.99': 2,
          '$5 - $9.99': 3,
          '$10 - $24.99': 4,
          '$25 - $49.99': 5,
          '$50 - $99.99': 6,
          '$100+': 7
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

  // ============================================================================
  // CART HANDLERS
  // ============================================================================
  const handleVariationChange = useCallback((cardId: number) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVariations(prev => ({
      ...prev,
      [cardId]: e.target.value
    }));
  }, []);

  const handleAddToCart = useCallback((card: CardForDisplay, selectedVariation: any) => () => {
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
      rarity: card.rarity || ''
    });
  }, [addToCart]);

  const updateCartQuantity = useCallback((id: number, quality: string, delta: number) => {
    const existingItem = cart.find(item => item.id === id && item.quality === quality);
    if (existingItem) {
      const newQuantity = existingItem.quantity + delta;
      updateQuantity(id, quality, newQuantity);
    }
  }, [cart, updateQuantity]);

  // ============================================================================
  // CHECKOUT HANDLERS
  // ============================================================================
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
      const result = await api.post<{ success: boolean }>('/orders', orderData);

      if (result?.success) {
        clearCart();
        return true;
      }

      throw new Error('Failed to submit order');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Order submission error:', error);
      }
      throw error;
    }
  }, [clearCart]);

  const handleCurrencyChange = (newCurrency: Currency) => {
    setCurrency(newCurrency);
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================
  if (filtersLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-mm-cream to-mm-tealLight">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-mm-gold focus:text-white focus:rounded-lg focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
        >
          Skip to main content
        </a>

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

        <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="lg:w-64 space-y-6">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="h-4 bg-mm-warmAccent rounded w-20 mb-3 animate-pulse"></div>
                  <div className="h-10 bg-mm-warmAccent rounded animate-pulse"></div>
                </div>
              ))}
            </aside>

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

        <div className="sr-only" aria-live="polite" aria-atomic="true">
          Loading cards... If this takes a while, the API might be waking up.
        </div>
      </div>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================
  if (filtersError || error) {
    return (
      <div className="min-h-screen bg-mm-cream flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-mm-darkForest mb-2">Connection Error</h2>
          <p className="text-mm-teal mb-4">{error || filtersError}</p>
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

  // ============================================================================
  // CHECKOUT VIEW
  // ============================================================================
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

  // ============================================================================
  // MAIN RENDER - CONTINUED IN NEXT MESSAGE DUE TO LENGTH
  // ============================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-mm-cream to-mm-tealLight">
      {/* Skip to main content */}
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

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-mm-warmAccent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-mm-gold to-mm-tealBright bg-clip-text text-transparent">
              TCG Singles
            </h1>
            <div className="flex items-center gap-3">
              <CurrencySelector
                currency={currency}
                onCurrencyChange={handleCurrencyChange}
                className="flex-shrink-0"
              />

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

        {/* Desktop Layout */}
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
                apiUrl={API_BASE}
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
                  <span className="font-medium">{groupedCardsFlat.length}</span> cards found
                </p>
              </div>

              {/* View Toggle */}
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

            {/* Card Display */}
            <div className={`w-full ${viewMode === 'list' ? 'max-w-6xl mx-auto' : ''}`}>
              {viewMode === 'grid' ? (
                /* Grid View */
                cards.length > VIRTUAL_SCROLL_CONFIG.INITIAL_BATCH_SIZE ? (
                  <ErrorBoundary>
                    <Suspense fallback={
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                        {Array.from({ length: 12 }, (_, i) => <CardSkeleton key={i} />)}
                      </div>
                    }>
                      <VirtualCardGrid
                        cards={cards}
                        selectedVariations={selectedVariations}
                        currency={currency}
                        onVariationChange={handleVariationChange}
                        onAddToCart={handleAddToCart}
                      />
                    </Suspense>
                  </ErrorBoundary>
                ) : (
                  <div>
                    {groupedCards.map((group, groupIndex) => (
                      <div key={groupIndex} className="mb-8">
                        {group.section && (
                          <SectionHeader title={group.section} count={group.cards.length} isGrid={true} />
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                          {group.cards.map((card) => {
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
                      {group.section && (
                        <SectionHeader title={group.section} count={group.cards.length} isGrid={false} />
                      )}
                      <div className="space-y-2">
                        {group.cards.map((card) => {
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

            {/* Empty State */}
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
                  className="text-mm-teal hover:text-mm-darkForest focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none rounded"
                  aria-label="Close filters"
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
                  apiUrl={API_BASE}
                  debounceMs={300}
                  minSearchLength={2}
                />

                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-mm-darkForest mb-3">Sort By</h3>
                  <div className="flex gap-2">
                    <select
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      className="flex-1 px-3 py-2 border border-mm-warmAccent rounded-lg focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
                      aria-label="Sort by"
                    >
                      <option value="name">Name</option>
                      <option value="set">Set</option>
                      <option value="rarity">Rarity</option>
                      <option value="price_low">Price: Low to High</option>
                      <option value="price_high">Price: High to Low</option>
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
            {cart.slice(0, 3).map((item) => (
              <div key={`${item.id}-${item.quality}`} className="flex items-center gap-2 text-sm">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-8 h-10 object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{item.name}</div>
                  <div className="text-xs text-mm-teal">
                    <div className="truncate">{item.set_name} #{item.card_number}</div>
                    <div>{item.quality} × {item.quantity}</div>
                    {item.foil_type && item.foil_type !== 'Regular' && (
                      <div className="text-yellow-600">✨ {item.foil_type}</div>
                    )}
                  </div>
                </div>
                <div className="text-mm-forest font-semibold">
                  {currency.symbol}{(item.price * item.quantity * currency.rate).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {cart.length > 3 && (
            <p className="text-xs text-mm-teal mt-2">+ {cart.length - 3} more items</p>
          )}

          <button onClick={() => setShowCart(true)} className="btn-mm-primary w-full mt-3">
            View Cart ({currency.symbol}{(cartTotal * currency.rate).toFixed(2)})
          </button>
        </div>
      )}

      {/* Shopping Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-mm-darkForest">Shopping Cart</h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-mm-teal hover:text-mm-darkForest focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none rounded"
                aria-label="Close cart"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-mm-teal mx-auto mb-4" />
                  <p className="text-mm-forest">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={`${item.id}-${item.quality}`} className="flex gap-4 p-4 bg-mm-tealLight rounded-lg border border-mm-warmAccent">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-20 h-28 object-contain rounded bg-white"
                        onError={(e) => {
                          (e.target as HTMLImageElement).onerror = null;
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="112"%3E%3Crect fill="%231e293b" width="80" height="112"/%3E%3C/svg%3E';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm mb-1 line-clamp-2">{item.name}</h3>
                        <div className="text-xs text-mm-teal mb-2 space-y-1">
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
                            <div>Language: {item.language}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quality, -1)}
                            disabled={item.quantity <= 1}
                            className="w-8 h-8 flex items-center justify-center rounded-md bg-mm-warmAccent hover:bg-mm-teal hover:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-medium min-w-[2rem] text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quality, 1)}
                            disabled={item.quantity >= item.stock}
                            className="w-8 h-8 flex items-center justify-center rounded-md bg-mm-warmAccent hover:bg-mm-teal hover:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id, item.quality)}
                            className="ml-auto text-red-600 hover:text-red-700 focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none rounded"
                            aria-label="Remove item from cart"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-mm-forest">
                          {currency.symbol}{(item.price * item.quantity * currency.rate).toFixed(2)}
                        </div>
                        <div className="text-xs text-mm-teal mt-1">
                          {currency.symbol}{(item.price * currency.rate).toFixed(2)} each
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t bg-mm-cream">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold text-mm-darkForest">Total:</span>
                  <span className="text-2xl font-bold text-mm-forest">
                    {currency.symbol}{(cartTotal * currency.rate).toFixed(2)}
                  </span>
                </div>
                <button onClick={handleCheckoutClick} className="btn-mm-primary w-full">
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notifications */}
      {cartNotifications.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2" role="region" aria-label="Notifications">
          {cartNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`px-4 py-3 rounded-lg shadow-lg ${
                notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                notification.type === 'warning' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                'bg-mm-tealLight border-mm-tealBright text-mm-tealBright'
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

      {/* ARIA Live Regions */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {groupedCards.length > 0 && (
          `Showing ${groupedCards.reduce((total, group) => total + group.cards.length, 0)} cards`
        )}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {(filtersLoading || loading) && "Loading cards..."}
        {(filtersError || error) && `Error: ${error || filtersError}`}
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