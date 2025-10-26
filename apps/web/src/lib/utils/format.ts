// apps/web/src/lib/utils/formatPrice.ts
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