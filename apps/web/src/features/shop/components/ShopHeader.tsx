import React, { useMemo } from 'react';
import { ShoppingCart } from 'lucide-react';
import CurrencySelector from '@/shared/components/forms/CurrencySelector';
import type { Cart, Currency } from '@/types';

interface ShopHeaderProps {
  cart: Cart;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  onCartClick: () => void;
  isOffline?: boolean;
}

export const ShopHeader: React.FC<ShopHeaderProps> = ({
  cart,
  currency,
  onCurrencyChange,
  onCartClick,
  isOffline = false
}) => {
  const cartCount = useMemo(() =>
    cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  return (
    <>
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
                onCurrencyChange={onCurrencyChange}
                className="flex-shrink-0"
              />

              <button
                onClick={onCartClick}
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
    </>
  );
};

export default ShopHeader;