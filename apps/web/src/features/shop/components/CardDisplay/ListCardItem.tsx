// apps/web/src/components/cards/ListCardItem.tsx
/**
 * List Card Item Component - REFACTORED FOR NEW ARCHITECTURE
 * Displays card in list view with variation selection
 * 
 * This component is primarily for storefront use
 * Admin views use CardItem component instead
 */
import React from 'react';
import OptimizedImage from '@/shared/components/media/OptimizedImage';
import VariationBadge from '@/shared/components/ui/VariationBadge';
import { Card, CardVariation, formatFinish, isFoilCard } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

type Currency = {
  symbol: string;
  rate: number;
};

type Props = {
  card: Card;
  selectedVariationKey: string;
  selectedVariation?: CardVariation;
  currency: Currency;
  onVariationChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onAddToCart: () => void;
};

// ============================================================================
// COMPONENT
// ============================================================================

const ListCardItem = React.memo<Props>(
  ({ card, selectedVariationKey, selectedVariation, currency, onVariationChange, onAddToCart }) => {
    // Validate we have variations (required for storefront)
    if (!card.variations || card.variations.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`ListCardItem: No variations for card ${card.id} "${card.name}"`);
      }
      return (
        <div className="card-mm p-4 border-2 border-red-300 bg-red-50">
          <p className="text-xs text-red-600">
            No variations available for {card.name}
          </p>
        </div>
      );
    }

    // Use provided variation or fallback to first
    const effectiveVariation = selectedVariation || card.variations[0];
    
    const price =
      effectiveVariation && typeof effectiveVariation.price === 'number'
        ? (effectiveVariation.price * currency.rate).toFixed(2)
        : (0).toFixed(2);

    const inStock = (effectiveVariation?.stock ?? 0) > 0;

    return (
      <div className="card-mm">
        <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
          {/* Thumbnail */}
          <div className="relative w-12 h-16 sm:w-16 sm:h-24 flex-shrink-0">
            <OptimizedImage
              src={card.image_url}
              alt={`${card.name} from ${card.set_name}`}
              width={80}
              height={112}
              className="bg-gradient-to-br from-mm-warmAccent to-mm-tealLight w-full h-full object-cover rounded-mm-sm"
              placeholder="blur"
              sizes="80px"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base text-mm-darkForest truncate mb-0.5">
              {card.name}
            </h3>
            <div className="flex items-center gap-2">
              <p className="text-xs text-mm-teal truncate">
                {card.set_name} • #{card.card_number}
              </p>
              {/* Variation badges for foil variations */}
              {effectiveVariation?.foil_type && effectiveVariation.foil_type !== 'Regular' && (
                <VariationBadge
                  finish={formatFinish(effectiveVariation.foil_type)}
                />
              )}
            </div>

            {/* Stock (mobile) */}
            <div className="flex items-center gap-1.5 mt-1 sm:hidden" aria-live="polite">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  inStock ? 'bg-emerald-500' : 'bg-mm-teal'
                }`}
                aria-hidden="true"
              />
              <span
                className={`text-xs font-medium ${
                  inStock ? 'text-emerald-700' : 'text-mm-teal'
                }`}
              >
                {inStock ? `${effectiveVariation?.stock} in stock` : 'Out of stock'}
              </span>
            </div>
          </div>

          {/* Desktop controls */}
          <div className="hidden sm:flex items-center gap-2 lg:gap-3 flex-shrink-0 min-w-0">
            {/* Condition */}
            <label className="sr-only" htmlFor={`condition-list-${card.id}`}>
              Select condition for {card.name}
            </label>
            <select
              id={`condition-list-${card.id}`}
              value={selectedVariationKey}
              onChange={onVariationChange}
              className="input-mm flex-shrink-0 min-w-[100px] max-w-[160px] text-xs lg:text-sm px-2 py-2"
            >
              {card.variations.map((variation) => (
                <option key={`${card.id}-${variation.variation_key}`} value={variation.variation_key}>
                  {variation.quality}
                  {variation.foil_type !== 'Regular' ? ` • ${variation.foil_type.slice(0, 1)}` : ''}
                </option>
              ))}
            </select>

            {/* Stock */}
            <div className="flex items-center gap-1 flex-shrink-0 min-w-[32px]" aria-live="polite">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  inStock ? 'bg-emerald-500' : 'bg-mm-teal'
                }`}
                aria-hidden="true"
              />
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  inStock ? 'text-emerald-700' : 'text-mm-teal'
                }`}
              >
                {inStock ? effectiveVariation?.stock : '0'}
              </span>
            </div>

            {/* Price */}
            <div className="text-right flex-shrink-0 min-w-[60px]" aria-live="polite">
              <span className="text-sm lg:text-base font-bold text-mm-darkForest block leading-none whitespace-nowrap">
                {currency.symbol}
                {price}
              </span>
              {inStock && (effectiveVariation?.stock ?? 0) <= 3 && (
                <span className="text-xs font-semibold text-red-600 block mt-0.5 whitespace-nowrap">
                  {effectiveVariation?.stock} left
                </span>
              )}
            </div>

            {/* Add to Cart */}
            <button
              onClick={onAddToCart}
              disabled={!inStock}
              className="btn-mm-primary px-3 lg:px-4 py-2.5 text-sm min-h-[44px] flex-shrink-0 whitespace-nowrap disabled:bg-mm-teal disabled:cursor-not-allowed disabled:shadow-none"
              aria-label={`Add ${card.name} to cart`}
              aria-disabled={!inStock}
            >
              <span className="hidden lg:inline">Add to Cart</span>
              <span className="lg:hidden">Add</span>
            </button>
          </div>

          {/* Mobile Add */}
          <div className="sm:hidden flex-shrink-0">
            <button
              onClick={onAddToCart}
              disabled={!inStock}
              className="btn-mm-primary px-3 py-2 text-sm min-h-[44px] whitespace-nowrap disabled:bg-mm-teal disabled:cursor-not-allowed disabled:shadow-none"
              aria-label={`Add ${card.name} to cart`}
              aria-disabled={!inStock}
            >
              Add
            </button>
          </div>
        </div>

        {/* Mobile condition selector */}
        <div className="sm:hidden border-t border-mm-warmAccent px-3 py-2 bg-mm-tealLight">
          <label
            htmlFor={`condition-list-mobile-${card.id}`}
            className="block text-xs font-semibold text-mm-forest uppercase tracking-wide mb-1"
          >
            Condition
          </label>
          <select
            id={`condition-list-mobile-${card.id}`}
            value={selectedVariationKey}
            onChange={onVariationChange}
            className="input-mm w-full text-sm px-2.5 py-2"
          >
            {card.variations.map((variation) => (
              <option key={`${card.id}-${variation.variation_key}`} value={variation.variation_key}>
                {variation.quality}
                {variation.foil_type !== 'Regular' ? ` • ${variation.foil_type}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  },
  (prev, next) => {
    const pv = prev.selectedVariation;
    const nv = next.selectedVariation;
    return (
      prev.card.id === next.card.id &&
      prev.selectedVariationKey === next.selectedVariationKey &&
      prev.currency.symbol === next.currency.symbol &&
      prev.currency.rate === next.currency.rate &&
      pv?.inventory_id === nv?.inventory_id &&
      pv?.price === nv?.price &&
      pv?.stock === nv?.stock &&
      pv?.quality === nv?.quality &&
      pv?.foil_type === nv?.foil_type &&
      pv?.language === nv?.language
    );
  }
);

ListCardItem.displayName = 'ListCardItem';
export default ListCardItem;