import React from 'react';
import type { CartItem, Currency } from '@/types';

interface CartItemDisplayProps {
  item: CartItem;
  currency: Currency;
  onUpdateQuantity: (delta: number) => void;
  onRemove: () => void;
}

export const CartItemDisplay: React.FC<CartItemDisplayProps> = (props) => {
  // TODO: Implementation will come later
  // For now, return a simple placeholder
  return (
    <div>
      <p>Cart Item Component - To be implemented</p>
    </div>
  );
};

export default CartItemDisplay;