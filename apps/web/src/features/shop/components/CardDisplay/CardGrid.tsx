// features/shop/components/CardDisplay/CardGrid.tsx
/**
 * Unified Card Grid Component
 * Consolidates CardGrid.tsx and VirtualCardGrid.tsx
 * Automatically uses virtual scrolling for large datasets
 * 
 * FIXED: Proper variation selection to prevent undefined errors
 */
import React, { useRef, useMemo, useState } from 'react';
import { useVirtualScroll } from '@/shared/hooks';
import { Card, CardVariation } from '@/types';
import CardItem from './CardItem';
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
  cardProps?: Record<string, any>;
  mode?: 'all' | 'inventory';
  onAddToInventory?: (card: T, variation: any) => void;
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
  cardProps = {},
  mode = 'all',
  onAddToInventory
}: CardGridProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // ✅ FIX: Track selected variations per card
  const [selectedVariations, setSelectedVariations] = useState<Record<number, string>>({});

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

  // ✅ FIX: Proper variation selection handler
  const handleVariationChange = (cardId: number) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVariations(prev => ({
      ...prev,
      [cardId]: e.target.value
    }));
  };

  // ✅ FIX: Proper default card renderer with variation selection
  const defaultRenderCard = (card: T) => {
    // Ensure card has variations array
    if (!card.variations || card.variations.length === 0) {
      console.warn(`Card ${card.id} has no variations, skipping render`);
      return null;
    }

    // Get selected variation key for this card, or default to first variation
    const selectedVariationKey = selectedVariations[card.id] || card.variations[0]?.variation_key;
    
    // Find the selected variation object
    const selectedVariation = card.variations.find(
      (v: CardVariation) => v.variation_key === selectedVariationKey
    ) || card.variations[0];

    // ✅ CRITICAL FIX: Ensure selectedVariation exists before rendering
    if (!selectedVariation) {
      console.warn(`No valid variation found for card ${card.id}`);
      return null;
    }

    // For admin mode, we need a different interaction model
    const isAdminMode = mode === 'all' || mode === 'inventory';
    
    return (
      <CardItem
        key={card.id}
        card={card as any}
        selectedVariationKey={selectedVariationKey}
        selectedVariation={selectedVariation}
        currency={cardProps?.currency || { symbol: '$', rate: 1 }}
        onVariationChange={handleVariationChange(card.id)}
        onAddToCart={isAdminMode 
          ? () => onAddToInventory?.(card, selectedVariation)
          : cardProps?.onAddToCart?.(card, selectedVariation) || (() => {})
        }
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
              {visibleItems.map((card) => cardRenderer(card))}
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
      {cards.map((card) => cardRenderer(card))}
    </div>
  );
};

// Export as default for compatibility
export default CardGrid;