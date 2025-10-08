import { useState, useMemo, useCallback } from 'react';

/**
 * Custom hook for virtual scrolling implementation
 * Optimized for card grids with responsive columns
 */
export const useVirtualScrolling = ({
  items = [],
  itemHeight = 420, // Height of each card including margins
  containerHeight = 800, // Height of the visible container
  overscan = 2, // Number of extra rows to render outside visible area
  columnCount = 4 // Default column count
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: containerHeight });

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const rowHeight = itemHeight;
    const totalRows = Math.ceil(items.length / columnCount);
    const visibleRowCount = Math.ceil(containerSize.height / rowHeight);

    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endRow = Math.min(totalRows - 1, startRow + visibleRowCount + overscan * 2);

    const startIndex = startRow * columnCount;
    const endIndex = Math.min(items.length - 1, (endRow + 1) * columnCount - 1);

    return {
      startIndex,
      endIndex,
      startRow,
      endRow,
      totalRows,
      visibleRowCount
    };
  }, [items.length, columnCount, containerSize.height, scrollTop, itemHeight, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange.startIndex, visibleRange.endIndex]);

  // Calculate container dimensions
  const totalHeight = useMemo(() => {
    const totalRows = Math.ceil(items.length / columnCount);
    return totalRows * itemHeight;
  }, [items.length, columnCount, itemHeight]);

  const offsetY = useMemo(() => {
    return visibleRange.startRow * itemHeight;
  }, [visibleRange.startRow, itemHeight]);

  // Handle scroll events
  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Resize observer for responsive column count
  const updateContainerSize = useCallback((element) => {
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  // Calculate responsive column count based on container width
  const responsiveColumnCount = useMemo(() => {
    if (containerSize.width === 0) return columnCount;

    // Responsive breakpoints matching Tailwind
    if (containerSize.width < 640) return 1;  // sm
    if (containerSize.width < 1024) return 2; // lg
    if (containerSize.width < 1280) return 3; // xl
    return 4; // xl and above
  }, [containerSize.width, columnCount]);

  // Scroll to specific item
  const scrollToItem = useCallback((index) => {
    const row = Math.floor(index / responsiveColumnCount);
    const scrollPosition = row * itemHeight;
    return scrollPosition;
  }, [responsiveColumnCount, itemHeight]);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    updateContainerSize,
    responsiveColumnCount,
    scrollToItem,
    visibleRange
  };
};

/**
 * Hook for progressive loading with virtual scrolling
 * Implements "Load More" functionality
 */
export const useProgressiveLoading = ({
  initialBatchSize = 100,
  batchSize = 50,
  totalItems = 0
}) => {
  const [loadedCount, setLoadedCount] = useState(initialBatchSize);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = useCallback(() => {
    if (isLoading || loadedCount >= totalItems) return;

    setIsLoading(true);

    // Simulate loading delay (remove in production if data is immediately available)
    setTimeout(() => {
      setLoadedCount(prev => Math.min(prev + batchSize, totalItems));
      setIsLoading(false);
    }, 100);
  }, [isLoading, loadedCount, totalItems, batchSize]);

  const reset = useCallback(() => {
    setLoadedCount(initialBatchSize);
    setIsLoading(false);
  }, [initialBatchSize]);

  const hasMore = loadedCount < totalItems;

  return {
    loadedCount,
    isLoading,
    hasMore,
    loadMore,
    reset
  };
};