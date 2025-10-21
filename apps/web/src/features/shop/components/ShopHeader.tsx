import React from 'react';
import type { Cart, Currency } from '@/types';

interface ShopHeaderProps {
  cart: Cart;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  onCartClick: () => void;
}

export const ShopHeader: React.FC<ShopHeaderProps> = (props) => {
  // TODO: Implementation will come later
  // For now, return a simple placeholder
  return (
    <div>
      <p>Shop Header Component - To be implemented</p>
    </div>
  );
};

export default ShopHeader;