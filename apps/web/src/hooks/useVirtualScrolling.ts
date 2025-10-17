import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

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
  const [isLoading, setIsLoading] = useState(false);

  const scrollTimeoutRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const previousItemsLengthRef = useRef(items.length);

  // Reset scroll position when items change significantly (e.g., filter change)
  useEffect(() => {
    const itemsLengthChanged = items.length !== previousItemsLengthRef.current;

    if (itemsLengthChanged) {
      // Batch state updates to prevent race conditions
      setIsLoading(true);

      // Small delay to allow items to render before scroll calculation
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // @ts-expect-error TS(2322): Type 'Timeout' is not assignable to type 'null'.
      scrollTimeoutRef.current = setTimeout(() => {
        setScrollTop(0); // Reset scroll to top on filter change
        setIsLoading(false);
        previousItemsLengthRef.current = items.length;
      }, 50);
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [items.length]);

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
  const handleScroll = useCallback((e: any) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Resize observer for responsive column count
  const updateContainerSize = useCallback((element: any) => {
    if (!element) return;

    // Clean up previous observer
    if (resizeObserverRef.current) {
      // @ts-expect-error TS(2339): Property 'disconnect' does not exist on type 'neve... Remove this comment to see the full error message
      resizeObserverRef.current.disconnect();
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Batch size updates to prevent flickering
        setContainerSize((prev) => {
          if (prev.width === width && prev.height === height) return prev;
          return { width, height };
        });
      }
    });

    resizeObserver.observe(element);
    // @ts-expect-error TS(2322): Type 'ResizeObserver' is not assignable to type 'n... Remove this comment to see the full error message
    resizeObserverRef.current = resizeObserver;

    return () => {
      resizeObserver.disconnect();
      if (resizeObserverRef.current === resizeObserver) {
        resizeObserverRef.current = null;
      }
    };
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
  const scrollToItem = useCallback((index: any) => {
    const row = Math.floor(index / responsiveColumnCount);
    const scrollPosition = row * itemHeight;
    return scrollPosition;
  }, [responsiveColumnCount, itemHeight]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (resizeObserverRef.current) {
        // @ts-expect-error TS(2339): Property 'disconnect' does not exist on type 'neve... Remove this comment to see the full error message
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    updateContainerSize,
    responsiveColumnCount,
    scrollToItem,
    visibleRange,
    isLoading // Add loading state for consumers
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