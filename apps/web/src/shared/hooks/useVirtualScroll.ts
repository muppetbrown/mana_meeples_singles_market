// ============================================================================
// shared/hooks/useVirtualScroll.ts - Virtual scrolling logic
// ============================================================================

import { useState, useCallback, useEffect, useRef } from 'react';

interface VirtualScrollConfig {
  items: any[];
  enabled?: boolean;
  itemHeight: number;
  containerHeight: number;
  columnCount?: number;
  overscan?: number;
}

interface VirtualScrollResult {
  visibleItems: any[];
  totalHeight: number;
  offsetY: number;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  visibleRange: { startIndex: number; endIndex: number };
  responsiveColumnCount: number;
}

/**
 * Virtual scrolling hook for large lists
 */
export function useVirtualScroll({
  items,
  enabled = true,
  itemHeight,
  containerHeight,
  columnCount = 4,
  overscan = 3
}: VirtualScrollConfig): VirtualScrollResult {
  const [scrollTop, setScrollTop] = useState(0);
  const [responsiveColumnCount, setResponsiveColumnCount] = useState(columnCount);

  // Handle responsive columns
  useEffect(() => {
    if (!enabled) return;

    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < 640) setResponsiveColumnCount(1);
      else if (width < 1024) setResponsiveColumnCount(Math.min(2, columnCount));
      else if (width < 1280) setResponsiveColumnCount(Math.min(3, columnCount));
      else setResponsiveColumnCount(columnCount);
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [enabled, columnCount]);

  // Calculate visible range
  const { startIndex, endIndex, visibleItems, totalHeight, offsetY } = useMemo(() => {
    if (!enabled || items.length === 0) {
      return {
        startIndex: 0,
        endIndex: items.length - 1,
        visibleItems: items,
        totalHeight: 0,
        offsetY: 0
      };
    }

    const rowHeight = itemHeight;
    const totalRows = Math.ceil(items.length / responsiveColumnCount);
    const totalHeight = totalRows * rowHeight;

    // Calculate visible rows
    const startRow = Math.floor(scrollTop / rowHeight);
    const endRow = Math.ceil((scrollTop + containerHeight) / rowHeight);

    // Add overscan
    const overscanStartRow = Math.max(0, startRow - overscan);
    const overscanEndRow = Math.min(totalRows - 1, endRow + overscan);

    // Convert to item indices
    const startIndex = overscanStartRow * responsiveColumnCount;
    const endIndex = Math.min(
      items.length - 1,
      (overscanEndRow + 1) * responsiveColumnCount - 1
    );

    const visibleItems = items.slice(startIndex, endIndex + 1);
    const offsetY = overscanStartRow * rowHeight;

    return { startIndex, endIndex, visibleItems, totalHeight, offsetY };
  }, [items, enabled, scrollTop, itemHeight, containerHeight, responsiveColumnCount, overscan]);

  // Scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange: { startIndex, endIndex },
    responsiveColumnCount
  };
}