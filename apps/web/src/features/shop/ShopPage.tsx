// apps\web\src\features\shop\ShopPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
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
import { CardDisplayArea } from '@/features/hooks/useCardDisplayArea';
import { ErrorBoundary } from '@/shared/layout';
import { CardSkeleton } from '@/shared/card';
import type { Currency } from '@/types';

// Local type definitions (simplified)
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

const ShopPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  // URL State - extracted from search params
  const searchTerm = searchParams.get('search') || '';
  const selectedGame = searchParams.get('game') || 'all';
  const selectedSet = searchParams.get('set') || 'all';
  const selectedTreatment = searchParams.get('treatment') || 'all';
  const selectedRarity = searchParams.get('rarity') || 'all';
  const selectedQuality = searchParams.get('quality') || 'all';
  const selectedFoilType = searchParams.get('foilType') || 'all';

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

  // Transform StorefrontCard to CardForDisplay
  const displayCards: CardForDisplay[] = useMemo(() =>
    cards.map(card => ({
      id: card.id,
      name: card.name,
      image_url: card.image_url || '',
      set_name: card.set_name,
      card_number: card.card_number,
      game_name: card.game_name,
      rarity: card.rarity ?? 'Unknown',
      total_stock: card.total_stock ?? 0,
      variation_count: card.variation_count ?? 0,
      variations: card.variations.map(v => ({
        variation_key: v.variation_key,
        quality: v.quality,
        foil_type: v.foil_type,
        language: v.language,
        price: v.price ?? 0,
        stock: v.stock ?? 0,
        inventory_id: v.inventory_id,
      }))
    })), [cards]
  );

  // Derived state for filters
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

            <div className="flex-1 space-y-6">
              <div className="h-16 bg-white rounded-lg shadow-sm animate-pulse"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <aside className="lg:w-64">
              <ShopFilters
                showMobileFilters={showMobileFilters}
                setShowMobileFilters={setShowMobileFilters}
                searchTerm={searchTerm}
                selectedGame={selectedGame}
                selectedSet={selectedSet}
                selectedTreatment={selectedTreatment}
                selectedRarity={selectedRarity}
                selectedQuality={selectedQuality}
                selectedFoilType={selectedFoilType}
              />
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 space-y-6">
              <ResultsHeader
                searchTerm={searchTerm}
                resultsCount={cards.length}
                viewMode={viewMode}
                setViewMode={setViewMode}
                activeFilters={[]}
                onClearFilter={() => {}}
                onClearAllFilters={() => {}}
              />

              <CardDisplayArea
                cards={cards}
                viewMode={viewMode}
                currency={currency}
                selectedVariations={selectedVariations}
                filters={filters}
                onVariationChange={handleVariationChange}
                setAddToCartModal={setAddToCartModal}
                loading={cardsLoading}
              />
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
          {cards.length > 0 && `Showing ${cards.length} cards`}
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
          key={`search-${searchTerm}-${cards.length}`}
        >
          {searchTerm && !cardsLoading && (
            cards.length > 0
              ? `Found ${cards.length} cards matching "${searchTerm}"`
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
              // Fetch the inventory details to get the complete variation info
              const response = await fetch(`/api/cards/${addToCartModal.cardId}/inventory`);
              const inventoryData = await response.json();
              const selectedInventory = inventoryData.options?.find(
                (opt: any) => opt.inventoryId === payload.inventoryId
              );

              if (!selectedInventory) {
                console.error('Could not find inventory details');
                return;
              }

              // Construct the CartItem with complete information
              addToCart({
                card_id: card.id,
                inventory_id: payload.inventoryId,
                card_name: card.name,
                variation_key: `${selectedInventory.quality}-${selectedInventory.foilType}-${selectedInventory.language}`,
                quality: selectedInventory.quality,
                foil_type: selectedInventory.foilType,
                language: selectedInventory.language,
                price: selectedInventory.priceCents / 100, // Convert cents to dollars
                stock: selectedInventory.inStock,
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