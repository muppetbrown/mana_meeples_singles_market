// apps/web/src/lib/utils/format.ts
// Shared price formatter to eliminate duplication across components.
import type { Currency } from '@/types'

export function formatCurrency(cents: number, currency: Currency): string {
const amount = (cents * (currency?.rate ?? 1)) / 100;
try {
return new Intl.NumberFormat(undefined, {
style: 'currency',
currency: currency?.code ?? 'USD',
currencyDisplay: 'symbol',
maximumFractionDigits: 2,
}).format(amount);
} catch {
// Fallback to symbol + fixed decimals
return `${currency?.symbol ?? '$'}${amount.toFixed(2)}`;
}
}

// Helper function for formatting prices that are already in dollars (not cents)
export function formatPrice(dollars: number, currency: Currency): string {
const amount = dollars * (currency?.rate ?? 1);
try {
return new Intl.NumberFormat(undefined, {
style: 'currency',
currency: currency?.code ?? 'USD',
currencyDisplay: 'symbol',
maximumFractionDigits: 2,
}).format(amount);
} catch {
// Fallback to symbol + fixed decimals
return `${currency?.symbol ?? '$'}${amount.toFixed(2)}`;
}
}

// Helper for simple currency symbol + amount formatting (matching current pattern)
export function formatCurrencySimple(dollars: number, currency: Currency): string {
const amount = dollars * (currency?.rate ?? 1);
return `${currency?.symbol ?? '$'}${amount.toFixed(2)}`;
}

// Helper for order totals and other admin displays (no currency conversion)
export function formatOrderTotal(dollars: number, currencySymbol: string = '$'): string {
return `${currencySymbol}${parseFloat(dollars.toString()).toFixed(2)}`;
}

/**
 * Calculate and format price display for cards with variations
 * Shows single price if all variations have the same price
 * Shows price range (min-max) if variations have different prices
 * Only considers variations with stock (in_stock > 0)
 */
export function formatPriceDisplay(
  variations: Array<{ price?: number | null; in_stock?: number }>,
  currency: Currency,
  mode: 'storefront' | 'inventory' | 'all' = 'storefront'
): string | null {
  // Filter to variations with stock (except in 'all' mode where we show all)
  const relevantVariations = mode === 'all'
    ? variations
    : variations.filter(v => v.in_stock && v.in_stock > 0);

  // Get prices from variations
  const prices = relevantVariations
    .map(v => v.price)
    .filter((price): price is number => price != null && price > 0);

  if (prices.length === 0) {
    return null;
  }

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // If all prices are the same, show single price
  if (minPrice === maxPrice) {
    return formatCurrencySimple(minPrice, currency);
  }

  // Show price range
  return `${formatCurrencySimple(minPrice, currency)} - ${formatCurrencySimple(maxPrice, currency)}`;
}