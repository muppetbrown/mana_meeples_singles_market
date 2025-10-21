import React from 'react';
import type { StorefrontCard, Currency, CartItem } from '@/types';

interface CardDisplayProps {
  cards: StorefrontCard[];
  viewMode: 'grid' | 'list';
  currency: Currency;
  loading: boolean;
  error: string | null;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onAddToCart: (item: Omit<CartItem, 'quantity'>) => void;
}

export const CardDisplay: React.FC<CardDisplayProps> = (props) => {
  // TODO: Implementation will come later
  // For now, return a simple placeholder
  return (
    <div>
      <p>Card Display Component - To be implemented</p>
    </div>
  );
};

export default CardDisplay;