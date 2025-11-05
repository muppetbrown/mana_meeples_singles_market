/**
 * Currency and Price Formatting Utilities
 * Centralized formatters with consistent behavior
 * REFACTORED: Consolidated from 4 functions to 2 main functions
 */

import type { Currency } from '@/types';

// ============================================================================
// CORE FORMATTING FUNCTION
// ============================================================================

/**
 * Internal helper: Format amount with optional Intl.NumberFormat
 * Handles both Intl formatting and fallback gracefully
 */
function formatWithIntl(
  amount: number,
  currency: Currency,
  useIntl: boolean = true
): string {
  if (!useIntl) {
    return `${currency?.symbol ?? '$'}${amount.toFixed(2)}`;
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency?.code ?? 'USD',
      currencyDisplay: 'symbol',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback to simple format
    return `${currency?.symbol ?? '$'}${amount.toFixed(2)}`;
  }
}

// ============================================================================
// PUBLIC API - TWO MAIN FUNCTIONS
// ============================================================================

/**
 * Format price in dollars with currency conversion
 * This is the primary formatter - handles both simple and Intl formatting
 *
 * @param dollars - Price in dollars (NOT cents)
 * @param currency - Currency object with symbol, code, and exchange rate
 * @param simple - If true, uses simple format (symbol + amount). Default: false (uses Intl)
 *
 * @example
 * formatPrice(10.50, { code: 'USD', symbol: '$', rate: 1 }) // "$10.50"
 * formatPrice(10.50, { code: 'NZD', symbol: 'NZ$', rate: 1.5 }) // "NZ$15.75"
 * formatPrice(10.50, currency, true) // Simple format: "$10.50"
 */
export function formatPrice(
  dollars: number,
  currency: Currency,
  simple: boolean = false
): string {
  const amount = dollars * (currency?.rate ?? 1);
  return formatWithIntl(amount, currency, !simple);
}

/**
 * Format price in cents (legacy support for APIs that return cents)
 * Converts cents to dollars and applies currency conversion
 *
 * @param cents - Price in cents (will be divided by 100)
 * @param currency - Currency object
 * @param simple - If true, uses simple format. Default: false
 *
 * @example
 * formatCurrency(1050, currency) // "$10.50"
 */
export function formatCurrency(
  cents: number,
  currency: Currency,
  simple: boolean = false
): string {
  const dollars = cents / 100;
  return formatPrice(dollars, currency, simple);
}

// ============================================================================
// CONVENIENCE ALIASES (for backward compatibility)
// ============================================================================

/**
 * Simple currency format (symbol + amount, no Intl)
 * Alias for formatPrice(dollars, currency, true)
 */
export function formatCurrencySimple(dollars: number, currency: Currency): string {
  return formatPrice(dollars, currency, true);
}

/**
 * Format order total (no currency conversion, for admin displays)
 * @param dollars - Price in dollars
 * @param currencySymbol - Currency symbol (default: '$')
 */
export function formatOrderTotal(dollars: number, currencySymbol: string = '$'): string {
  return `${currencySymbol}${parseFloat(dollars.toString()).toFixed(2)}`;
}

// ============================================================================
// CARD-SPECIFIC FORMATTERS
// ============================================================================

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
