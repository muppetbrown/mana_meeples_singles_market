// features/shop/components/CardDisplay/CardGrid.tsx
/**
 * Unified Card Grid Component - REFACTORED FOR NEW ARCHITECTURE
 * Consolidates CardGrid.tsx and VirtualCardGrid.tsx
 * Automatically uses virtual scrolling for large datasets
 * 
 * NEW ARCHITECTURE:
 * - Admin mode: Cards have variation metadata directly (no variations array)
 * - Storefront mode: Cards have variations array for purchase options
 * - Adapts rendering based on card structure
 */
import React, { useRef, useMemo, useState } from 'react';
import { useVirtualScroll } from '@/shared/hooks';
import { Card, CardVariation, isStorefrontCard } from '@/types';
import { CardItem, CardSkeleton } from '@/shared/components';
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
  onAddToInventory?: (card: T) => void;
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
  
  // Track selected variations per card (for storefront mode)
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

  // Variation selection handler (for storefront mode)
  const handleVariationChange = (cardId: number) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVariations(prev => ({
      ...prev,
      [cardId]: e.target.value
    }));
  };

  // ============================================================================
  // DEFAULT CARD RENDERER - HANDLES BOTH ADMIN AND STOREFRONT
  // ============================================================================
  
  const defaultRenderCard = (card: T) => {
    const isAdminMode = mode === 'all' || mode === 'inventory';
    
    // ========================================================================
    // ADMIN MODE: Cards have variation metadata directly (no variations array)
    // ========================================================================
    if (isAdminMode) {
      // In admin mode, cards don't have variations array
      // Each card IS a variation, with metadata directly on it
      return (
        <CardItem
          key={card.id}
          card={card}
          selectedVariationKey={null} // Not used in admin mode
          selectedVariation={null}     // Not used in admin mode
          currency={cardProps?.currency || { symbol: '$', rate: 1 }}
          onVariationChange={() => {}} // No-op in admin mode
          onAddToCart={() => onAddToInventory?.(card)}
          isAdminMode={true}
        />
      );
    }
    
    // ========================================================================
    // STOREFRONT MODE: Cards have variations array for purchase options
    // ========================================================================
    
    // Skip cards without variations in storefront mode
    if (!isStorefrontCard(card)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Storefront card ${card.id} "${card.name}" has no variations array`);
      }
      return null;
    }

    // Get selected variation key for this card, or default to first variation
    const selectedVariationKey = selectedVariations[card.id] || card.variations[0]?.variation_key;
    
    // Find the selected variation object
    const selectedVariation = card.variations.find(
      (v: CardVariation) => v.variation_key === selectedVariationKey
    ) || card.variations[0];

    // Safety check (should never happen with type guard above)
    if (!selectedVariation) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Card ${card.id} "${card.name}" has variations array but no valid variation found`);
      }
      return null;
    }
    
    return (
      <CardItem
        key={card.id}
        card={card}
        selectedVariationKey={selectedVariationKey}
        selectedVariation={selectedVariation}
        currency={cardProps?.currency || { symbol: '$', rate: 1 }}
        onVariationChange={handleVariationChange(card.id)}
        onAddToCart={cardProps?.onAddToCart?.(card, selectedVariation) || (() => {})}
        isAdminMode={false}
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