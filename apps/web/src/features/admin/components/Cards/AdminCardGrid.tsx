// features/admin/components/Cards/AdminCardGrid.tsx
/**
 * Admin Card Grid Component
 * Wraps the generic CardGrid component with admin-specific functionality
 * Handles card grouping by card_number as required
 */
import React from 'react';
import { Card } from '@/types';
import CardGrid from '@/shared/components/cardDisplay/CardGrid';

interface AdminCardGridProps {
  cards: Card[];
  mode: 'all' | 'inventory';
  viewMode: 'grid' | 'list';
  onAddToInventory?: (card: Card) => void;
}

const AdminCardGrid: React.FC<AdminCardGridProps> = ({
  cards,
  mode,
  viewMode,
  onAddToInventory
}) => {
  return (
    <CardGrid
      cards={cards}
      viewMode={viewMode}
      mode={mode}
      onAddToInventory={onAddToInventory}
      cardProps={{
        currency: { symbol: '$', rate: 1 }
      }}
    />
  );
};

export default AdminCardGrid;