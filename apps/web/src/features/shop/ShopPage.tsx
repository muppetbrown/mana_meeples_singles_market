import React, { useState } from 'react';
import { useShopFilters } from './hooks/useShopFilters';
import { useCart } from './hooks/useCart';
import { useCardFetching } from './hooks/useCardFetching';
import { ShopHeader } from './components/ShopHeader';
import FiltersPanel from './components/Search/FiltersPanel';
import { ActiveFilters } from './components/Search/ActiveFilters';
import { CardDisplay } from './components/CardDisplay/CardDisplay';
import CartModal from './components/Cart/CartModal';
import MiniCart from './components/Cart/MiniCart';
import Checkout from './components/Cart/Checkout';
import ErrorBoundary from '@/shared/components/layout/ErrorBoundary';
import type { Currency } from '@/types';

const ShopPage: React.FC = () => {
  // Hooks
  const { 
    filters, 
    updateFilters, 
    clearFilters, 
    games, 
    sets, 
    filterOptions, 
    isLoading: filtersLoading, 
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
    error 
  } = useCardFetching(filters, games, sets);

  // Local UI state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currency, setCurrency] = useState<Currency>({ code: 'NZD', symbol: 'NZ$', rate: 1.0 });
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Checkout flow
  if (showCheckout) {
    return (
      <ErrorBoundary>
        <Checkout
          cart={cart}
          currency={currency}
          onBack={() => setShowCheckout(false)}
          onOrderSubmit={async (orderData) => {
            // Handle order submission
            clearCart();
            return true;
          }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mm-cream to-mm-tealLight">
      <ShopHeader
        cart={cart}
        currency={currency}
        onCurrencyChange={setCurrency}
        onCartClick={() => setShowCart(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="lg:flex lg:gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:w-80">
            <FiltersPanel
              filters={filters}
              games={games}
              sets={sets}
              filterOptions={filterOptions}
              onFilterChange={updateFilters}
              onClearFilters={clearFilters}
            />
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            <ActiveFilters
              filters={filters}
              onClearFilter={updateFilters}
              onClearAll={clearFilters}
            />

            <CardDisplay
              cards={cards}
              viewMode={viewMode}
              currency={currency}
              loading={cardsLoading || filtersLoading}
              error={error}
              onViewModeChange={setViewMode}
              onAddToCart={addToCart}
            />
          </div>
        </div>
      </main>

      {/* Mini Cart */}
      {cart.itemCount > 0 && !showCart && (
        <MiniCart
          cart={cart}
          currency={currency}
          onViewCart={() => setShowCart(true)}
        />
      )}

      {/* Cart Modal */}
      {showCart && (
        <CartModal
          cart={cart}
          currency={currency}
          onClose={() => setShowCart(false)}
          onCheckout={() => {
            setShowCart(false);
            setShowCheckout(true);
          }}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
        />
      )}

      {/* Notifications */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {cartNotifications.map((notification) => (
          <div
            key={notification.id}
            className="px-4 py-3 rounded-lg shadow-lg bg-green-50 border-green-200 text-green-800"
            role="status"
          >
            {notification.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShopPage;