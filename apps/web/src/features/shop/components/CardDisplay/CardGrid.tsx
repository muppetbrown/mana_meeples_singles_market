// features/shop/components/CardDisplay/CardGrid.tsx
/**
 * Unified Card Grid Component
 * Consolidates CardGrid.tsx and VirtualCardGrid.tsx
 * Automatically uses virtual scrolling for large datasets
 */
import React, { useRef, useMemo } from 'react';
import { useVirtualScroll } from '@/shared/hooks';
import { Card } from '@/types';
import CardItem from './CardItem';
import ListCardItem from './ListCardItem';
import CardSkeleton from './CardSkeleton';
import { ChevronDown } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface CardGridProps<T extends Card = Card> {
  cards: T[];
  viewMode?: 'grid' | 'list';
  isLoading?: boolean;
  columnCount?: number;
  cardHeight?: number;
  containerHeight?: number;
  enableVirtualScroll?: boolean;
  onCardClick?: (card: T) => void;
  renderCard?: (card: T) => React.ReactNode;
  // Props passed to individual card components
  cardProps?: Record<string, any>;
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

export const CardGrid = <T extends Card = Card>({
  cards,
  viewMode = 'grid',
  isLoading = false,
  columnCount,
  cardHeight,
  containerHeight = DEFAULT_CONTAINER_HEIGHT,
  enableVirtualScroll: enableVirtualScrollProp,
  onCardClick,
  renderCard,
  cardProps = {}
}: CardGridProps<T>) => {
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

  // Default card renderer
  const defaultRenderCard = (card: T) => {
    const CardComponent = viewMode === 'list' ? ListCardItem : CardItem;
    return (
      <CardComponent
        key={card.id}
        card={card}
        onClick={() => onCardClick?.(card)}
        {...cardProps}
      />
    );
  };

  const cardRenderer = renderCard || defaultRenderCard;

  // ========================================================================
  // LOADING STATE
  // ========================================================================

  if (isLoading) {
    return (
      <div 
        className={`grid ${getGridClasses()} gap-4 sm:gap-6`}
        role="status"
        aria-label="Loading cards"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <CardSkeleton key={i} viewMode={viewMode} />
        ))}
      </div>
    );
  }

  // ========================================================================
  // EMPTY STATE
  // ========================================================================

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 text-lg">No cards found</p>
      </div>
    );
  }

  // ========================================================================
  // SIMPLE GRID (Non-virtual)
  // ========================================================================

  if (!shouldUseVirtualScroll) {
    return (
      <div 
        className={`grid ${getGridClasses()} gap-4 sm:gap-6`}
        role="region"
        aria-label="Card grid"
      >
        {cards.map(cardRenderer)}
      </div>
    );
  }

  // ========================================================================
  // VIRTUAL SCROLLING GRID
  // ========================================================================

  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange
  } = virtualScroll;

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="relative overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100"
        style={{
          height: `${Math.min(totalHeight, containerHeight)}px`,
          maxHeight: '80vh'
        }}
        onScroll={handleScroll}
        role="region"
        aria-label="Virtual card grid"
        aria-live="polite"
        aria-rowcount={cards.length}
      >
        {/* Spacer for total height */}
        <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
          {/* Visible items container */}
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0
            }}
          >
            <div className={`grid ${getGridClasses()} gap-4 sm:gap-6`}>
              {visibleItems.map((card, index) => (
                <div
                  key={card.id}
                  style={{
                    minHeight: `${effectiveCardHeight - 24}px`
                  }}
                  aria-rowindex={visibleRange.startIndex + index + 1}
                >
                  {cardRenderer(card)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Performance indicator (dev only) */}
      {process.env.NODE_ENV === 'development' && shouldUseVirtualScroll && (
        <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
          Virtual Scrolling: Showing {visibleItems.length} of {cards.length} cards
          | Range: {visibleRange.startIndex}-{visibleRange.endIndex}
          | Columns: {responsiveColumns}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default CardGrid;

// Also export compound components for flexibility
export { CardItem, ListCardItem, CardSkeleton };

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Basic usage
<CardGrid cards={cards} />

// Grid view with custom columns
<CardGrid 
  cards={cards} 
  viewMode="grid"
  columnCount={3}
/>

// List view
<CardGrid 
  cards={cards} 
  viewMode="list"
/>

// Force virtual scrolling off
<CardGrid 
  cards={cards}
  enableVirtualScroll={false}
/>

// Custom card renderer
<CardGrid
  cards={cards}
  renderCard={(card) => (
    <CustomCardComponent 
      card={card}
      onFavorite={() => handleFavorite(card.id)}
    />
  )}
/>

// With loading state
<CardGrid 
  cards={cards}
  isLoading={isLoading}
/>

// Pass props to card components
<CardGrid
  cards={cards}
  cardProps={{
    currency: 'NZD',
    onAddToCart: handleAddToCart,
    selectedVariationKey: selectedVariations[card.id]
  }}
/>
*/