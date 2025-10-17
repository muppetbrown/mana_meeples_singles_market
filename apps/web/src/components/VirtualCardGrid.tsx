import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { useVirtualScrolling, useProgressiveLoading } from '../hooks/useVirtualScrolling';

/**
 * Virtual Card Grid Component
 * Optimized for displaying large numbers of cards with smooth scrolling
 */
const VirtualCardGrid = ({
  cards = [],
  CardComponent,
  cardHeight = 420,
  containerHeight = 800,
  enableProgressiveLoading = true,
  onLoadMore,
  ...cardProps
}: any) => {
  const containerRef = useRef(null);
  const [containerDimensions, setContainerDimensions] = useState({ height: containerHeight });

  // Progressive loading for large datasets
  const {
    loadedCount,
    isLoading: isLoadingMore,
    hasMore,
    loadMore,
    reset
  } = useProgressiveLoading({
    initialBatchSize: 100,
    batchSize: 50,
    totalItems: cards.length
  });

  // Use either progressive loading or all cards
  const displayCards = enableProgressiveLoading ? cards.slice(0, loadedCount) : cards;

  // Virtual scrolling
  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    updateContainerSize,
    responsiveColumnCount,
    visibleRange
  } = useVirtualScrolling({
    items: displayCards,
    itemHeight: cardHeight,
    containerHeight: containerDimensions.height,
    overscan: 2,
    columnCount: 4
  });

  // Setup resize observer
  useEffect(() => {
    if (containerRef.current) {
      const cleanup = updateContainerSize(containerRef.current);
      return cleanup;
    }
  }, [updateContainerSize]);

  // Update container height based on actual container
  useEffect(() => {
    if (containerRef.current) {
      // @ts-expect-error TS(2339): Property 'getBoundingClientRect' does not exist on... Remove this comment to see the full error message
      const rect = containerRef.current.getBoundingClientRect();
      setContainerDimensions({ height: Math.max(rect.height, containerHeight) });
    }
  }, [containerHeight]);

  // Auto-load more when nearing the end
  useEffect(() => {
    if (!enableProgressiveLoading) return;

    const isNearEnd = visibleRange.endIndex >= displayCards.length - 10;
    if (isNearEnd && hasMore && !isLoadingMore) {
      loadMore();
      onLoadMore?.();
    }
  }, [visibleRange.endIndex, displayCards.length, hasMore, isLoadingMore, loadMore, onLoadMore, enableProgressiveLoading]);

  // Reset when cards change
  useEffect(() => {
    reset();
  }, [cards.length, reset]);

  // Calculate grid column classes based on responsive column count
  const getGridClasses = useCallback(() => {
    switch (responsiveColumnCount) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-4';
      default: return 'grid-cols-4';
    }
  }, [responsiveColumnCount]);

  // Manual load more button handler
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadMore();
      onLoadMore?.();
    }
  }, [hasMore, isLoadingMore, loadMore, onLoadMore]);

  // Show fallback for very small datasets
  if (displayCards.length <= 20) {
    return (
      <div className={`grid ${getGridClasses()} gap-4 sm:gap-6`}>
        // @ts-expect-error TS(7006): Parameter 'card' implicitly has an 'any' type.
        {displayCards.map((card, index) => (
          <div key={card.id || index}>
            <CardComponent card={card} {...cardProps} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Virtual Scrolling Container */}
      <div
        ref={containerRef}
        className="relative overflow-y-auto"
        style={{
          height: `${Math.min(totalHeight, containerHeight)}px`,
          maxHeight: '80vh'
        }}
        onScroll={handleScroll}
        role="region"
        aria-label="Card grid"
        aria-live="polite"
        aria-busy={isLoadingMore}
      >
        {/* Total height placeholder */}
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
              {visibleItems.map((card, index) => {
                const actualIndex = visibleRange.startIndex + index;
                return (
                  <div
                    // @ts-expect-error TS(2339): Property 'id' does not exist on type 'never'.
                    key={card.id || actualIndex}
                    style={{
                      minHeight: `${cardHeight - 24}px` // Account for margins
                    }}
                  >
                    <CardComponent card={card} {...cardProps} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Loading indicator for virtual scrolling */}
        {isLoadingMore && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 text-sm text-slate-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              Loading more cards...
            </div>
          </div>
        )}
      </div>

      {/* Manual Load More Button (fallback) */}
      {enableProgressiveLoading && hasMore && !isLoadingMore && (
        <div className="text-center">
          <button
            onClick={handleLoadMore}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            aria-label="Load more cards"
          >
            <ChevronDown className="w-4 h-4" />
            Load More Cards ({cards.length - loadedCount} remaining)
          </button>
        </div>
      )}

      {/* Performance info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
          Virtual Scrolling: Showing {visibleItems.length} of {displayCards.length} cards
          (Total: {cards.length}) |
          Columns: {responsiveColumnCount} |
          Visible Range: {visibleRange.startIndex}-{visibleRange.endIndex}
        </div>
      )}
    </div>
  );
};

export default VirtualCardGrid;