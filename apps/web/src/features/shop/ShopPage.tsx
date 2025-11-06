// apps\web\src\features\shop\ShopPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useShopViewMode,
  useCardFetching,
  useCart,
  useShopFilters
} from '@/features/hooks';
import {
  ResultsHeader,
  ShopHeader,
  ShopFilters,
  ShopCart,
  ShopState,
  useShopCartUtils,
  AddToCartModal
} from '@/features/shop/components';
import { ErrorBoundary, CardGrid, CardList } from '@/shared/layout';
import { CardSkeleton } from '@/shared/card';
import { SectionHeader } from '@/shared/ui';
import { api, ENDPOINTS } from '@/lib/api';
import {
  transformStorefrontCards,
  groupCardsForBrowse,
  groupCardsBySort
} from '@/lib/utils';
import type { Currency, BrowseBaseCard } from '@/types';

const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Track if we've ever loaded cards successfully (to prevent full-page reload on filter changes)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // URL State - extracted from search params
  // STANDARDIZED: Using treatment and finish
  const searchTerm = searchParams.get('search') || '';
  const selectedGame = searchParams.get('game') || 'all';
  const selectedSet = searchParams.get('set') || 'all';
  const selectedTreatment = searchParams.get('treatment') || 'all';
  const selectedFinish = searchParams.get('finish') || 'all';
  const selectedRarity = searchParams.get('rarity') || 'all';
  const selectedQuality = searchParams.get('quality') || 'all';

  // Hooks for data fetching
  const {
    games,
    sets,
    loading: filtersLoading,
    error: filtersError
  } = useShopFilters();

  const {
    cards,
    loading: cardsLoading,
    error: cardsError
  } = useCardFetching({
    searchTerm,
    selectedGame,
    selectedSet,
    selectedTreatment,
    selectedFinish,
    games,
    sets
  });

  const {
    cart,
    addNotification
  } = useCart();

  const { viewMode, setViewMode, currency, setCurrency, isOffline, setIsOffline } = useShopViewMode();

  // UI State - consolidated
  const [showCart, setShowCart] = useState(false);
  const [showMiniCart, setShowMiniCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [addToCartModal, setAddToCartModal] = useState<{ open: boolean; cardId: number }>({ open: false, cardId: 0 });

  // Use extracted cart utilities
  const {
    cartTotal,
    cartCount,
    handleVariationChange,
    handleAddToCart,
    selectedVariations,
    addToCart
  } = useShopCartUtils(cards);

  /**
   * Transform StorefrontCards to BrowseBaseCards for unified display.
   *
   * StorefrontCards represent unique card variations (treatment/finish combos)
   * with inventory options (quality/language). We transform and group them
   * to match the admin display format.
   */
  const browseCards: BrowseBaseCard[] = useMemo(() => {
    // Use centralized transformation utility with price calculation
    const transformedCards = transformStorefrontCards(cards, {
      calculatePrice: true,
      defaults: {
        treatment: 'STANDARD',
        finish: 'nonfoil'
      }
    });

    // Group by (set_id, card_number) into BrowseBaseCard format
    return groupCardsForBrowse(transformedCards);
  }, [cards]);

  // Filter dropdown options to only show values that have inventory
  // This ensures customers only see filters for cards that are actually available
  const availableGames = useMemo(() => {
    if (cards.length === 0) return games; // Show all on initial load
    const uniqueGameNames = new Set(cards.map(card => card.game_name));
    return games.filter(game => uniqueGameNames.has(game.name));
  }, [cards, games]);

  const availableSets = useMemo(() => {
    // Filter sets based on selected game, not on currently displayed cards
    if (selectedGame === 'all') return sets; // Show all sets if no game selected

    // Find the selected game's ID
    const selectedGameObj = games.find(game => game.name === selectedGame);
    if (!selectedGameObj) return sets;

    // Show only sets that belong to the selected game
    return sets.filter(set => set.game_id === selectedGameObj.id);
  }, [selectedGame, sets, games]);

  // Sorting state
  const sortBy = (searchParams.get('sortBy') as 'name' | 'price' | 'set' | 'rarity' | 'cardNumber') || 'name';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';

  const handleSortByChange = useCallback((newSortBy: 'name' | 'price' | 'set' | 'rarity' | 'cardNumber') => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('sortBy', newSortBy);
      return newParams;
    });
  }, [setSearchParams]);

  const handleSortOrderChange = useCallback((newSortOrder: 'asc' | 'desc') => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('sortOrder', newSortOrder);
      return newParams;
    });
  }, [setSearchParams]);

  // UNIFIED: Apply sorting and grouping with section headers (same as admin)
  const sortedAndGroupedCards = useMemo(() => {
    return groupCardsBySort(browseCards, sortBy, sortOrder);
  }, [browseCards, sortBy, sortOrder]);

  // Derived state for filters
  // STANDARDIZED: Using treatment and finish
  const filters = useMemo(() => ({
    quality: selectedQuality,
    rarity: selectedRarity,
    treatment: selectedTreatment,
    finish: selectedFinish,
    language: searchParams.get('language') || 'English',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sortBy,
    sortOrder,
    set: selectedSet
  }), [searchParams, selectedQuality, selectedRarity, selectedTreatment, selectedFinish, selectedSet, sortBy, sortOrder]);

  // Currency change handler
  const handleCurrencyChange = (newCurrency: Currency) => {
    setCurrency(newCurrency);
  };

  // Effects
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

  // Track when cards are successfully loaded
  useEffect(() => {
    if (cards.length > 0 && !hasLoadedOnce) {
      setHasLoadedOnce(true);
    }
  }, [cards.length, hasLoadedOnce]);

  // Initial loading state - only show full-page loading on very first load
  // Once we've loaded successfully once, always show content with loading overlays
  const isInitialLoad = (filtersLoading || cardsLoading) && !hasLoadedOnce;

  if (isInitialLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-mm-cream to-mm-tealLight">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-mm-gold focus:text-white focus:rounded-lg focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
        >
          Skip to main content
        </a>

        <header className="bg-white shadow-md sticky top-0 z-50 border-b-2 border-mm-warmAccent">
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

        <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <aside className="lg:w-64 flex-shrink-0 space-y-6">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="h-4 bg-mm-warmAccent rounded w-20 mb-3 animate-pulse"></div>
                  <div className="h-10 bg-mm-warmAccent rounded animate-pulse"></div>
                </div>
              ))}
            </aside>

            <div className="flex-1 min-w-0 space-y-6">
              <div className="h-16 bg-white rounded-lg shadow-sm animate-pulse"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-mm-cream to-mm-tealLight">
        {/* Skip Link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-mm-gold focus:text-white focus:rounded-lg focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
        >
          Skip to main content
        </a>

        {/* Header */}
        <ShopHeader
          searchTerm={searchTerm}
          selectedGame={selectedGame}
          selectedSet={selectedSet}
          cart={cart}
          currency={currency}
          isOffline={isOffline}
          onCartClick={() => setShowCart(true)}
          onCurrencyChange={setCurrency}
        />

        {/* Main Content */}
        <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Filters Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
                <ShopFilters
                  showMobileFilters={showMobileFilters}
                  setShowMobileFilters={setShowMobileFilters}
                  searchTerm={searchTerm}
                  selectedGame={selectedGame}
                  selectedSet={selectedSet}
                  selectedTreatment={selectedTreatment}
                  selectedFinish={selectedFinish}
                  selectedRarity={selectedRarity}
                  selectedQuality={selectedQuality}
                  availableGames={availableGames}
                  availableSets={availableSets}
                />
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 space-y-6">
              <ResultsHeader
                searchTerm={searchTerm}
                resultsCount={cards.length}
                viewMode={viewMode}
                setViewMode={setViewMode}
                activeFilters={[]}
                onClearFilter={() => {}}
                onClearAllFilters={() => {}}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortByChange={handleSortByChange}
                onSortOrderChange={handleSortOrderChange}
              />

              {/* UNIFIED: Card Display using shared CardGrid/CardList (same pattern as admin) */}
              <div className="relative">
                {/* Loading overlay for filter changes */}
                {cardsLoading && browseCards.length > 0 && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 border-4 border-mm-gold border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm text-mm-forest font-medium">Updating cards...</p>
                    </div>
                  </div>
                )}

                {sortedAndGroupedCards.length > 0 ? (
                  viewMode === 'grid' ? (
                    /* Grid View with Section Headers */
                    <div>
                      {sortedAndGroupedCards.map((group, groupIndex) => (
                        <div key={groupIndex} className="mb-8">
                          <SectionHeader title={group.header} count={group.cards.length} isGrid={true} />
                          <CardGrid
                            cards={group.cards}
                            mode="storefront"
                            viewMode={viewMode}
                            columnCount={3}
                            currency={currency}
                            onAddToCart={({ card, inventoryId, quantity }) => {
                              // Use base card ID for the modal to fetch correct card data
                              setAddToCartModal({ open: true, cardId: card.id });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* List View with Section Headers */
                    <div>
                      {sortedAndGroupedCards.map((group, groupIndex) => (
                        <div key={groupIndex} className="mb-8">
                          <SectionHeader title={group.header} count={group.cards.length} isGrid={false} />
                          <CardList
                            cards={group.cards}
                            mode="storefront"
                            currency={currency}
                            onAction={(card, variation) => {
                              // Use base card ID for the modal to fetch correct card data
                              setAddToCartModal({ open: true, cardId: card.id });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )
                ) : cardsLoading ? (
                  /* Show skeleton while loading initial results */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <CardSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                    <p className="text-mm-forest text-lg">No cards found matching your search</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Cart Components */}
        <ShopCart
          cards={cards}
          currency={currency}
          showCart={showCart}
          setShowCart={setShowCart}
          showMiniCart={showMiniCart}
          setShowMiniCart={setShowMiniCart}
          showCheckout={showCheckout}
          setShowCheckout={setShowCheckout}
        />

        {/* UI State Management */}
        <ShopState
          showCart={showCart}
          setShowCart={setShowCart}
          showMiniCart={showMiniCart}
          setShowMiniCart={setShowMiniCart}
          showCheckout={showCheckout}
          setShowCheckout={setShowCheckout}
          showKeyboardShortcuts={showKeyboardShortcuts}
          setShowKeyboardShortcuts={setShowKeyboardShortcuts}
          showMobileFilters={showMobileFilters}
          setShowMobileFilters={setShowMobileFilters}
        />

        {/* ARIA Live Regions */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {browseCards.length > 0 && `Showing ${browseCards.length} cards`}
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
          key={`search-${searchTerm}-${browseCards.length}`}
        >
          {searchTerm && !cardsLoading && (
            browseCards.length > 0
              ? `Found ${browseCards.length} cards matching "${searchTerm}"`
              : `No cards found matching "${searchTerm}"`
          )}
        </div>

        {/* Add to Cart Modal */}
        <AddToCartModal
          cardId={addToCartModal.cardId}
          isOpen={addToCartModal.open}
          onClose={() => setAddToCartModal({ open: false, cardId: 0 })}
          currency={currency}
          onAdd={async (payload: { inventoryId: number; quantity: number }) => {
            // Find the card data
            const card = cards.find(c => c.id === addToCartModal.cardId);
            if (!card) return;

            try {
              // UNIFIED: Fetch the inventory details using api client
              const response = await api.get<{
                card: {
                  variations: Array<{
                    inventory_id: number;
                    quality: string;
                    language: string;
                    stock: number;
                    price: number;
                  }>;
                };
              }>(ENDPOINTS.STOREFRONT.CARD_BY_ID(addToCartModal.cardId));

              const selectedVariation = response.card.variations?.find(
                (v: any) => v.inventory_id === payload.inventoryId
              );

              if (!selectedVariation) {
                console.error('Could not find inventory details');
                return;
              }

              // Construct the CartItem with complete information
              addToCart({
                card_id: card.id,
                inventory_id: payload.inventoryId,
                card_name: card.name,
                variation_key: `${selectedVariation.quality}-${selectedVariation.language}`,
                quality: selectedVariation.quality,
                finish: card.finish?.toLowerCase() || 'nonfoil', // Use card's finish field instead
                language: selectedVariation.language,
                price: selectedVariation.price, // Price is already in dollars
                stock: selectedVariation.stock,
                image_url: card.image_url || '',
                set_name: card.set_name,
                card_number: card.card_number,
                game_name: card.game_name,
                rarity: card.rarity || 'Unknown'
              }, payload.quantity);

              setAddToCartModal({ open: false, cardId: 0 });
            } catch (error) {
              console.error('Error adding to cart:', error);
            }
          }}
        />
      </div>
    </ErrorBoundary>
  );
};

export default ShopPage;