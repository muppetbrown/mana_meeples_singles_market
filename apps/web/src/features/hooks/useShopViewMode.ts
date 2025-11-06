import { useState, useCallback } from 'react';
import type { Currency } from '@/types';

export type ViewMode = 'grid' | 'list';

interface UseShopViewModeReturn {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
}

export function useShopViewMode(): UseShopViewModeReturn {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currency, setCurrency] = useState<Currency>({
    symbol: 'NZ$',
    rate: 1.64, // NZD rate from USD base (prices stored in USD)
    code: 'NZD',
    label: 'New Zealand Dollar'
  });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const handleCurrencyChange = useCallback((newCurrency: Currency) => {
    setCurrency(newCurrency);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  return {
    viewMode,
    setViewMode: handleViewModeChange,
    currency,
    setCurrency: handleCurrencyChange,
    isOffline,
    setIsOffline
  };
}