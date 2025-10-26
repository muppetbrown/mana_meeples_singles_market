// apps/web/src/lib/utils/format.ts
// Shared price formatter to eliminate duplication across components.
import { Currency } from '@/types'

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