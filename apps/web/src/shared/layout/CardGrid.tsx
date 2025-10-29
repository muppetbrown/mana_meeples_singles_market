// apps/web/src/shared/layout/CardGrid.tsx
/**
 * Unified Card Grid Component - IMPLEMENTATION OF NEW ARCHITECTURE
 * Handles both grid and list views with proper mode switching
 *
 * ARCHITECTURE:
 * - Uses new CardItem with 3-dropdown system for grid view
 * - Uses new CardList with badge system for list view
 * - Properly handles storefront/inventory/all modes
 * - Supports virtual scrolling for large datasets
 */
import React, { useRef, useMemo } from 'react';
import { useVirtualScroll } from '@/lib/utils';
import { CardItem, CardSkeleton } from '@/shared/card';
import { CardList } from '@/shared/layout';
import { ChevronDown } from 'lucide-react';
import type {
  BrowseBaseCard,
  BrowseVariation,
  Currency
} from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export interface CardGridProps {
  cards: BrowseBaseCard[];
  viewMode?: 'grid' | 'list';
  isLoading?: boolean;
  columnCount?: number;
  cardHeight?: number;
  containerHeight?: number;
  enableVirtualScroll?: boolean;
  mode: 'storefront' | 'inventory' | 'all';
  currency?: Currency;

  // Mode-specific handlers
  onAddToCart?: (params: {
    card: BrowseBaseCard;
    inventoryId: number;
    quantity: number;
  }) => void;

  onAddToInventory?: (card: BrowseBaseCard) => void;
  onManage?: (card: BrowseBaseCard) => void;
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

export const CardGrid: React.FC<CardGridProps> = ({
  cards,
  viewMode = 'grid',
  isLoading = false,
  columnCount,
  cardHeight,
  containerHeight = DEFAULT_CONTAINER_HEIGHT,
  enableVirtualScroll: enableVirtualScrollProp,
  mode,
  currency = { code: 'USD', symbol: '$', rate: 1, label: 'US Dollar' },
  onAddToCart,
  onAddToInventory,
  onManage
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------------------------------------
  // LIST VIEW HANDLING
  // --------------------------------------------------------------------------

  // If list view, delegate to CardList component
  if (viewMode === 'list') {
    const handleListAction = (card: BrowseBaseCard, variation?: BrowseVariation) => {
      switch (mode) {
        case 'all':
          onAddToInventory?.(card);
          break;
        case 'inventory':
          onManage?.(card);
          break;
        case 'storefront':
          // For storefront, we need to open a modal to select quality/language
          // This would typically be handled by the parent component
          console.log('Storefront list action for card:', card.name, 'variation:', variation);
          break;
      }
    };

    return (
      <CardList
        cards={cards}
        mode={mode}
        currency={currency}
        onAction={handleListAction}
      />
    );
  }

  // --------------------------------------------------------------------------
  // GRID VIEW SETUP
  // --------------------------------------------------------------------------

  // Determine if virtual scrolling should be enabled
  const shouldUseVirtualScroll = useMemo(() => {
    if (enableVirtualScrollProp !== undefined) {
      return enableVirtualScrollProp;
    }
    return cards.length > VIRTUAL_SCROLL_THRESHOLD;
  }, [cards.length, enableVirtualScrollProp]);

  // Calculate responsive column count
  const responsiveColumns = columnCount || 4;

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

  // Get grid classes based on columns
  const getGridClasses = () => {
    switch (responsiveColumns) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-1 sm:grid-cols-2';
      case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 4: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
      default: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    }
  };

  // --------------------------------------------------------------------------
  // GRID CARD RENDERER
  // --------------------------------------------------------------------------

  const renderGridCard = (card: BrowseBaseCard) => {
    const handleCardAction = (params: any) => {
      switch (mode) {
        case 'all':
          onAddToInventory?.(card);
          break;
        case 'inventory':
          onManage?.(card);
          break;
        case 'storefront':
          if (params.inventoryId) {
            onAddToCart?.({
              card,
              inventoryId: params.inventoryId,
              quantity: 1
            });
          }
          break;
      }
    };

    return (
      <CardItem
        key={card.id}
        card={card}
        mode={mode}
        currency={currency}
        onAction={handleCardAction}
      />
    );
  };

  // --------------------------------------------------------------------------
  // LOADING STATE
  // --------------------------------------------------------------------------

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

  // --------------------------------------------------------------------------
  // VIRTUAL SCROLL RENDERING
  // --------------------------------------------------------------------------

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
              {visibleItems.map((card) => renderGridCard(card))}
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

  // --------------------------------------------------------------------------
  // STANDARD RENDERING (no virtual scroll)
  // --------------------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      className={`grid ${getGridClasses()} gap-4 sm:gap-5 lg:gap-6`}
    >
      {cards.map((card) => renderGridCard(card))}
    </div>
  );
};

// Export as default for compatibility
export default CardGrid;