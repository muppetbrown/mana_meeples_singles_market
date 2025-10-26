import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useShopKeyboardShortcuts,
  useShopViewMode,
  useVariationSelection,
  useCardFetching,
  useCart,
  useShopFilters,
} from '@/features/hooks';
import {
  ResultsHeader,
  ShopHeader,
  Checkout
 } from '@/features/shop/components';
import {
  MobileFilterModal,
  MobileFilterButton,
  FilterSidebar,
  CardDisplayArea,
  CardSkeleton,
  KeyboardShortcuts,
  ErrorBoundary
} from '@/shared/components'
import { formatCurrencySimple } from '@/lib/utils';
import type { Currency } from '@/types';

// Local type definitions
interface SelectedVariations {
  [cardId: number]: string;
}

interface CardForDisplay {
  id: number;
  name: string;
  image_url: string;
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

const TCGShop: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL State
  const searchTerm = searchParams.get('search') || '';
  const selectedGame = searchParams.get('game') || 'all';
  const selectedSet = searchParams.get('set') || 'all';
  const selectedTreatment = searchParams.get('treatment') || 'all';
  const selectedRarity = searchParams.get('rarity') || 'all';
  const selectedQuality = searchParams.get('quality') || 'all';
  const selectedFoilType = searchParams.get('foilType') || 'all';

  // Hooks
  const {
    games,
    sets,
    filterOptions,
    loading: filtersLoading,
    error: filtersError
  } = useShopFilters();

  const {
    cart,
    cartNotifications,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    addNotification
  } = useCart();

  const {
    cards,
    loading: cardsLoading,
    error: cardsError
  } = useCardFetching({
    searchTerm,
    selectedGame,
    selectedSet,
    selectedTreatment,
    games,
    sets
  });

  const { selectedVariations, selectVariation, clearStaleSelections } = useVariationSelection();
  const { viewMode, setViewMode, currency, setCurrency, isOffline, setIsOffline } = useShopViewMode();

  // UI State
  const [showCart, setShowCart] = useState(false);
  const [showMiniCart, setShowMiniCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Keyboard shortcuts
  useShopKeyboardShortcuts({
    showCart,
    showMobileFilters,
    showKeyboardShortcuts,
    setShowCart,
    setShowMobileFilters,
    setShowKeyboardShortcuts
  });

  // Transform StorefrontCard to CardForDisplay
  const displayCards: CardForDisplay[] = useMemo(() =>
    cards.map(card => ({
      id: card.id,
      name: card.name,
      image_url: card.image_url || '',
      set_name: card.set_name,
      card_number: card.card_number,
      game_name: card.game_name,
      rarity: card.rarity,
      total_stock: card.total_stock,
      variation_count: card.variation_count,
      variations: card.variations
    })), [cards]
  );

  // Derived state
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
    cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    [cart]
  );

  const cartCount = useMemo(() =>
    cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  // URL parameter handlers
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

  // Additional filters config
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

  // Active filters for display
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

  const handleClearFilter = useCallback((filterKey: string) => {
    if (filterKey === 'search') {
      handleSearchChange('');
    } else if (filterKey === 'game') {
      handleGameChange('all');
    } else {
      handleFilterChange(filterKey, '');
    }
  }, [handleSearchChange, handleGameChange, handleFilterChange]);

  // Cart handlers
  const handleVariationChange = useCallback((cardId: number) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    selectVariation(cardId, e.target.value);
  }, [selectVariation]);

  const handleAddToCart = useCallback((card: CardForDisplay, selectedVariation: any) => () => {
    addToCart({
      card_id: card.id,
      inventory_id: selectedVariation.inventory_id,
      card_name: card.name,
      image_url: card.image_url,
      quality: selectedVariation.quality,
      price: selectedVariation.price,
      stock: selectedVariation.stock,
      foil_type: selectedVariation.foil_type,
      language: selectedVariation.language || 'English',
      game_name: card.game_name,
      set_name: card.set_name,
      card_number: card.card_number,
      rarity: card.rarity || '',
      variation_key: selectedVariation.variation_key
    });
  }, [addToCart]);

  const updateCartQuantity = useCallback((cardId: number, quality: string, delta: number) => {
    const existingItem = cart.items.find(item => item.card_id === cardId && item.quality === quality);
    if (existingItem) {
      const newQuantity = existingItem.quantity + delta;
      updateQuantity(cardId, existingItem.variation_key, newQuantity);
    }
  }, [cart, updateQuantity]);

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
      // Implement order submission logic here
      clearCart();
      return true;
    } catch (error) {
      throw error;
    }
  }, [clearCart]);

  const handleCurrencyChange = (newCurrency: Currency) => {
    setCurrency(newCurrency);
  };

  // Effects
  useEffect(() => {
    clearStaleSelections(displayCards.map(card => card.id));
  }, [displayCards, clearStaleSelections]);

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
  }, [addNotification, setIsOffline]);

  // Show mini cart when items added
  useEffect(() => {
    if (cart.items.length > 0 && !showCart) {
      setShowMiniCart(true);
    }
  }, [cart, showCart]);

  // Loading state
  if (filtersLoading || cardsLoading) {
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

  // Error state
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

  // Checkout view
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

  // Main render
  return (
    <div className="min-h-screen bg-gradient-to-br from-mm-cream to-mm-tealLight">
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-mm-gold focus:text-white focus:rounded-lg focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
      >
        Skip to main content
      </a>

      <ShopHeader
        cart={cart}
        currency={currency}
        onCurrencyChange={handleCurrencyChange}
        onCartClick={() => setShowCart(true)}
        isOffline={isOffline}
      />

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <MobileFilterButton
          showMobileFilters={showMobileFilters}
          setShowMobileFilters={setShowMobileFilters}
        />

        {/* Desktop Layout */}
        <div className="lg:flex lg:gap-6">
          <FilterSidebar
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            selectedGame={selectedGame}
            onGameChange={handleGameChange}
            selectedSet={selectedSet}
            onSetChange={handleSetChange}
            games={games}
            sets={sets}
            additionalFilters={additionalFilters}
          />

          <div className="flex-1">
            <ResultsHeader
              cardCount={displayCards.length}
              viewMode={viewMode}
              setViewMode={setViewMode}
              activeFilters={activeFilters}
              onClearFilter={handleClearFilter}
              onClearAllFilters={clearAllFilters}
            />

            <CardDisplayArea
              cards={displayCards}
              viewMode={viewMode}
              currency={currency}
              selectedVariations={selectedVariations}
              filters={filters}
              onVariationChange={handleVariationChange}
              onAddToCart={handleAddToCart}
              loading={cardsLoading}
            />
          </div>
        </div>

        <MobileFilterModal
          showMobileFilters={showMobileFilters}
          setShowMobileFilters={setShowMobileFilters}
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          selectedGame={selectedGame}
          onGameChange={handleGameChange}
          selectedSet={selectedSet}
          onSetChange={handleSetChange}
          games={games}
          sets={sets}
          additionalFilters={additionalFilters}
          filters={filters}
          handleFilterChange={handleFilterChange}
        />
      </main>

      {/* Persistent Mini Cart */}
      {showMiniCart && cart.items.length > 0 && !showCart && (
        <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-lg border border-mm-warmAccent p-4 z-40 max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-mm-darkForest">Cart ({cartCount})</h3>
            <button
              onClick={() => setShowMiniCart(false)}
              className="text-mm-teal hover:text-mm-teal focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none rounded"
              aria-label="Close mini cart"
            >
              ❌
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {cart.items.slice(0, 3).map((item) => (
              <div key={`${item.card_id}-${item.quality}`} className="flex items-center gap-2 text-sm">
                <img
                  src={item.image_url}
                  alt={item.card_name}
                  className="w-8 h-10 object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{item.card_name}</div>
                  <div className="text-xs text-mm-teal">
                    <div className="truncate">{item.set_name} #{item.card_number}</div>
                    <div>{item.quality} × {item.quantity}</div>
                    {item.foil_type && item.foil_type !== 'Regular' && (
                      <div className="text-yellow-600">✨ {item.foil_type}</div>
                    )}
                  </div>
                </div>
                <div className="text-mm-forest font-semibold">
                  {formatCurrencySimple(item.price * item.quantity, currency)}
                </div>
              </div>
            ))}
          </div>

          {cart.items.length > 3 && (
            <p className="text-xs text-mm-teal mt-2">+ {cart.items.length - 3} more items</p>
          )}

          <button onClick={() => setShowCart(true)} className="btn-mm-primary w-full mt-3">
            View Cart ({formatCurrencySimple(cartTotal, currency)})
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
                ❌
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {cart.items.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 text-mm-teal mx-auto mb-4">🛒</div>
                  <p className="text-mm-forest">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.items.map(item => (
                    <div key={`${item.card_id}-${item.quality}`} className="flex gap-4 p-4 bg-mm-tealLight rounded-lg border border-mm-warmAccent">
                      <img
                        src={item.image_url}
                        alt={item.card_name}
                        className="w-20 h-28 object-contain rounded bg-white"
                        onError={(e) => {
                          (e.target as HTMLImageElement).onerror = null;
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="112"%3E%3Crect fill="%231e293b" width="80" height="112"/%3E%3C/svg%3E';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm mb-1 line-clamp-2">{item.card_name}</h3>
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
                            onClick={() => updateCartQuantity(item.card_id, item.quality, -1)}
                            disabled={item.quantity <= 1}
                            className="w-8 h-8 flex items-center justify-center rounded-md bg-mm-warmAccent hover:bg-mm-teal hover:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
                            aria-label="Decrease quantity"
                          >
                            ➖
                          </button>
                          <span className="font-medium min-w-[2rem] text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.card_id, item.quality, 1)}
                            disabled={item.quantity >= item.stock}
                            className="w-8 h-8 flex items-center justify-center rounded-md bg-mm-warmAccent hover:bg-mm-teal hover:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
                            aria-label="Increase quantity"
                          >
                            ➕
                          </button>
                          <button
                            onClick={() => removeFromCart(item.card_id, item.quality)}
                            className="ml-auto text-red-600 hover:text-red-700 focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none rounded"
                            aria-label="Remove item from cart"
                          >
                            ❌
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-mm-forest">
                          {formatCurrencySimple(item.price * item.quantity, currency)}
                        </div>
                        <div className="text-xs text-mm-teal mt-1">
                          {formatCurrencySimple(item.price, currency)} each
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.items.length > 0 && (
              <div className="p-6 border-t bg-mm-cream">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold text-mm-darkForest">Total:</span>
                  <span className="text-2xl font-bold text-mm-forest">
                    {formatCurrencySimple(cartTotal, currency)}
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
        {displayCards.length > 0 && `Showing ${displayCards.length} cards`}
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
        key={`search-${searchTerm}-${displayCards.length}`}
      >
        {searchTerm && !cardsLoading && (
          displayCards.length > 0
            ? `Found ${displayCards.length} cards matching "${searchTerm}"`
            : `No cards found matching "${searchTerm}"`
        )}
      </div>

      <KeyboardShortcuts
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
    </div>
  );
};

export default TCGShop;