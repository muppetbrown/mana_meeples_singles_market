// apps/web/src/features/admin/components/Cards/AdminCardGrid.tsx
/**
 * Admin-specific Card Grid Component
 * Handles BrowseBaseCard with BrowseVariation[] (admin browse data)
 * Separate from the main CardGrid to avoid type conflicts
 */
import React, { useRef, useMemo, useState } from 'react';
import { useVirtualScroll } from '@/lib/utils';
import type { BrowseBaseCard, BrowseVariation } from '@/types';
import { CardItem, CardSkeleton } from '@/shared/card';
import { ChevronDown } from 'lucide-react';
import { browseCardToCard } from '@/features/admin/utils/cardAdapters';

// ============================================================================
// TYPES
// ============================================================================

interface AdminCardGridProps {
  cards: BrowseBaseCard[];
  viewMode?: 'grid' | 'list';
  isLoading?: boolean;
  columnCount?: number;
  cardHeight?: number;
  containerHeight?: number;
  enableVirtualScroll?: boolean;
  onCardClick?: (card: BrowseBaseCard) => void;
  mode?: 'all' | 'inventory';
  onAddToInventory?: (card: BrowseBaseCard) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VIRTUAL_SCROLL_THRESHOLD = 50; // Enable virtual scroll for >50 cards
const DEFAULT_CARD_HEIGHT = {
  grid: 420,
  list: 180
};
const DEFAULT_CONTAINER_HEIGHT = 800;

// ============================================================================
// COMPONENT
// ============================================================================

export const AdminCardGrid = ({
  cards,
  viewMode = 'grid',
  isLoading = false,
  columnCount,
  cardHeight,
  containerHeight = DEFAULT_CONTAINER_HEIGHT,
  enableVirtualScroll: enableVirtualScrollProp,
  onCardClick,
  mode = 'all',
  onAddToInventory
}: AdminCardGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine if virtual scrolling should be enabled
  const shouldUseVirtualScroll = useMemo(() => {
    if (enableVirtualScrollProp !== undefined) {
      return enableVirtualScrollProp;
    }
    return cards.length > VIRTUAL_SCROLL_THRESHOLD;
  }, [cards.length, enableVirtualScrollProp]);

  // Calculate responsive column count
  const responsiveColumns = columnCount || (viewMode === 'list' ? 1 : 4);

  // Effective card height
  const effectiveCardHeight = cardHeight || DEFAULT_CARD_HEIGHT[viewMode];

  // Virtual scrolling hook (only active if enabled)
  const virtualScroll = useVirtualScroll({
    items: cards,
    enabled: shouldUseVirtualScroll,
    itemHeight: effectiveCardHeight,
    containerHeight,
    columnCount: responsiveColumns,
    overscan: 3
  });

  // Get grid classes based on view mode and columns
  const getGridClasses = () => {
    if (viewMode === 'list') return 'grid-cols-1';
    switch (responsiveColumns) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-1 sm:grid-cols-2';
      case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 4: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
      default: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    }
  };

  // ============================================================================
  // ADMIN CARD RENDERER - SPECIALIZED FOR BrowseBaseCard
  // ============================================================================

  const renderAdminCard = (browseCard: BrowseBaseCard) => {
    // Convert BrowseBaseCard to Card for CardItem component
    const card = browseCardToCard(browseCard);

    // For admin mode, we treat the card itself as the main entity
    // with its variations being the different card rows
    return (
      <CardItem
        key={browseCard.id}
        card={card}
        selectedVariationKey={null} // Not used in admin mode
        selectedVariation={null}     // Not used in admin mode
        currency={{ code: 'USD', symbol: '$', rate: 1, label: 'US Dollar' }}
        onVariationChange={() => {}} // No-op in admin mode
        onAddToCart={() => onAddToInventory?.(browseCard)}
        isAdminMode={true}
      />
    );
  };

  // ========================================================================
  // LOADING STATE
  // ========================================================================

  if (isLoading) {
    return (
      <div
        className={`grid ${getGridClasses()} gap-4 sm:gap-5 lg:gap-6`}
        role="status"
        aria-label="Loading cards"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // ========================================================================
  // VIRTUAL SCROLL RENDERING
  // ========================================================================

  if (shouldUseVirtualScroll) {
    const {
      visibleItems,
      totalHeight,
      offsetY,
      handleScroll,
      visibleRange
    } = virtualScroll;

    return (
      <div
        ref={containerRef}
        className="relative overflow-auto"
        style={{ height: `${containerHeight}px` }}
        onScroll={handleScroll}
      >
        <div
          style={{
            height: `${totalHeight}px`,
            position: 'relative'
          }}
        >
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              willChange: 'transform'
            }}
          >
            <div className={`grid ${getGridClasses()} gap-4 sm:gap-5 lg:gap-6`}>
              {visibleItems.map((card) => renderAdminCard(card))}
            </div>
          </div>
        </div>

        {/* Scroll indicator - show if not at end */}
        {visibleRange.endIndex < cards.length - 1 && (
          <div className="flex justify-center py-4">
            <ChevronDown className="w-6 h-6 text-slate-400 animate-bounce" />
          </div>
        )}
      </div>
    );
  }

  // ========================================================================
  // STANDARD RENDERING (no virtual scroll)
  // ========================================================================

  return (
    <div
      ref={containerRef}
      className={`grid ${getGridClasses()} gap-4 sm:gap-5 lg:gap-6`}
    >
      {cards.map((card) => renderAdminCard(card))}
    </div>
  );
};

// Export as default for compatibility
export default AdminCardGrid;