// apps/web/src/features/hooks/useCurrency.ts
import { useState, useEffect, useCallback } from 'react';
import { fetchExchangeRates, getSupportedCurrencies, type CurrencyWithRate } from '@/services/currency/exchangeRateService';
import { CURRENCY_CONFIG, FEATURES } from '@/lib/constants';
import type { Currency } from '@/types';

interface UseCurrencyReturn {
  currencies: CurrencyWithRate[];
  currentCurrency: Currency;
  setCurrency: (code: string) => void;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing currency with dynamic exchange rates
 * Automatically fetches and caches exchange rates from the API
 */
export function useCurrency(initialCurrencyCode: string = CURRENCY_CONFIG.DEFAULT_CURRENCY): UseCurrencyReturn {
  const [currencies, setCurrencies] = useState<CurrencyWithRate[]>([]);

  // Find the initial currency's rate from config
  const initialCurrencyConfig = CURRENCY_CONFIG.SUPPORTED_CURRENCIES.find(
    c => c.code === CURRENCY_CONFIG.DEFAULT_CURRENCY
  );

  const [currentCurrency, setCurrentCurrency] = useState<Currency>({
    symbol: CURRENCY_CONFIG.DEFAULT_SYMBOL,
    rate: initialCurrencyConfig?.rate ?? 1.64, // Use config rate or fallback to NZD rate
    code: CURRENCY_CONFIG.DEFAULT_CURRENCY,
    label: initialCurrencyConfig?.name ?? 'New Zealand Dollar',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Fetch exchange rates
  const loadExchangeRates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (FEATURES.AUTO_CURRENCY_UPDATE) {
        // Fetch live rates from API
        const [currenciesData, ratesResponse] = await Promise.all([
          getSupportedCurrencies(),
          fetchExchangeRates(),
        ]);

        setCurrencies(currenciesData);
        setLastUpdated(ratesResponse.lastUpdated);

        // Update current currency with new rate
        const updatedCurrency = currenciesData.find(c => c.code === currentCurrency.code);
        if (updatedCurrency) {
          setCurrentCurrency({
            symbol: updatedCurrency.symbol,
            rate: updatedCurrency.rate,
            code: updatedCurrency.code,
            label: updatedCurrency.name,
          });
        }
      } else {
        // Use static rates from config
        const staticCurrencies = CURRENCY_CONFIG.SUPPORTED_CURRENCIES.map(c => ({
          code: c.code,
          symbol: c.symbol,
          name: c.name,
          rate: c.rate,
        }));
        setCurrencies(staticCurrencies);
        setLastUpdated(Date.now());
      }
    } catch (err) {
      console.error('Failed to load exchange rates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load exchange rates');

      // Fallback to static rates
      const fallbackCurrencies = CURRENCY_CONFIG.SUPPORTED_CURRENCIES.map(c => ({
        code: c.code,
        symbol: c.symbol,
        name: c.name,
        rate: c.rate,
      }));
      setCurrencies(fallbackCurrencies);
    } finally {
      setIsLoading(false);
    }
  }, [currentCurrency.code]);

  // Load exchange rates on mount and when AUTO_CURRENCY_UPDATE changes
  useEffect(() => {
    loadExchangeRates();

    // Set up auto-refresh interval if enabled
    if (FEATURES.AUTO_CURRENCY_UPDATE) {
      const interval = setInterval(() => {
        loadExchangeRates();
      }, CURRENCY_CONFIG.UPDATE_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [loadExchangeRates]);

  // Initialize with the requested currency
  useEffect(() => {
    const initialCurrency = currencies.find(c => c.code === initialCurrencyCode);
    if (initialCurrency) {
      setCurrentCurrency({
        symbol: initialCurrency.symbol,
        rate: initialCurrency.rate,
        code: initialCurrency.code,
        label: initialCurrency.name,
      });
    }
  }, [initialCurrencyCode, currencies]);

  // Change currency
  const setCurrency = useCallback((code: string) => {
    const currency = currencies.find(c => c.code === code);
    if (currency) {
      setCurrentCurrency({
        symbol: currency.symbol,
        rate: currency.rate,
        code: currency.code,
        label: currency.name,
      });
    }
  }, [currencies]);

  // Manual refresh
  const refresh = useCallback(async () => {
    await loadExchangeRates();
  }, [loadExchangeRates]);

  return {
    currencies,
    currentCurrency,
    setCurrency,
    isLoading,
    error,
    lastUpdated,
    refresh,
  };
}
