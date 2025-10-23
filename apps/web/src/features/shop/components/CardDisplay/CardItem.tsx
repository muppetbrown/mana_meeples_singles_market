// apps/web/src/features/shop/components/CardDisplay/CardItem.tsx
/**
 * Card Item Component
 * Displays individual card with variation selection
 * 
 * FIXED: Proper null checks and error handling for undefined variations
 */
import React from 'react';
import OptimizedImage from '@/shared/components/media/OptimizedImage';
import { ACCESSIBILITY_CONFIG } from '@/lib/constants';

type Variation = {
  variation_key: string;
  quality: string;
  foil_type: string;
  language?: string;
  price: number;
  stock: number;
  id?: string | number;
};

type Card = {
  id: string | number;
  name: string;
  image_url?: string;
  set_name: string;
  card_number?: string;
  variations: Variation[];
};

interface CardWithVariations extends Card {
  variations: Variation[];
  image_url?: string;
}

type Currency = {
  symbol: string;
  rate: number;
};

export type CardItemProps = {
  card: Card;
  selectedVariationKey: string;
  selectedVariation?: Variation;
  currency: Currency;
  onVariationChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onAddToCart: () => void;
};

const CardItem = React.memo<CardItemProps>(
  ({ card, selectedVariationKey, selectedVariation, currency, onVariationChange, onAddToCart }) => {
    // ✅ CRITICAL FIX: Validate that we have a selected variation
    // If selectedVariation is undefined, try to get the first variation from the card
    const effectiveVariation = selectedVariation || card.variations?.[0];
    
    // ✅ CRITICAL FIX: If still no variation, render an error state
    if (!effectiveVariation) {
      console.error(`CardItem: No variation available for card ${card.id} "${card.name}"`);
      return (
        <div className="card-mm flex flex-col h-full border-2 border-red-300 bg-red-50">
          <div className="p-4">
            <h3 className="font-semibold text-sm text-red-700">
              {card.name}
            </h3>
            <p className="text-xs text-red-600 mt-2">
              No variations available for this card
            </p>
          </div>
        </div>
      );
    }

    // ✅ FIX: Safe price calculation with proper null checks
    const price =
      effectiveVariation && typeof effectiveVariation.price === 'number'
        ? (effectiveVariation.price * currency.rate).toFixed(2)
        : (0).toFixed(2);

    const imageUrl = card.image_url || '/placeholder-card.png';

    // ✅ FIX: Safe stock check with proper null coalescing
    const inStock = (effectiveVariation?.stock ?? 0) > 0;

    // ✅ FIX: Safe foil type check with proper null coalescing
    const foilType = effectiveVariation?.foil_type || 'Regular';
    const isFoil = foilType !== 'Regular';

    return (
      <div className="card-mm flex flex-row lg:flex-col h-full">
        {/* Image */}
        <div className="relative flex-shrink-0 w-28 sm:w-36 lg:w-full">
          <OptimizedImage
            src={imageUrl}
            alt={card.name}
            width={250}
            height={350}
            className={`w-full h-32 sm:h-44 lg:h-64 object-cover bg-gradient-to-br from-mm-warmAccent to-mm-tealLight ${
              isFoil
                ? 'ring-2 ring-yellow-400 ring-offset-2 shadow-yellow-200/50 shadow-lg'
                : ''
            }`}
            placeholder="blur"
            sizes="(max-width: 640px) 128px, (max-width: 1024px) 192px, 100%"
          />
          {isFoil && (
            <div className="absolute top-1 left-1 lg:top-2 lg:left-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs font-bold px-1.5 py-0.5 lg:px-2 lg:py-1 rounded-mm-sm shadow-md border border-yellow-300">
              ✨ {foilType}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 lg:p-5 flex flex-col gap-3 lg:gap-3 flex-grow min-w-0">
          <div className="flex-shrink-0">
            <h3 className="font-semibold text-sm lg:text-lg leading-tight text-mm-darkForest mb-1 lg:mb-2 line-clamp-2">
              {card.name}
            </h3>
            <p className="text-xs lg:text-sm text-mm-teal pb-2 lg:pb-3 border-b border-mm-warmAccent">
              {card.set_name} • #{card.card_number}
            </p>
          </div>

          {/* Condition */}
          <div className="space-y-1 lg:space-y-2 flex-shrink-0">
            <label htmlFor={`condition-${card.id}`} className="block text-xs font-semibold text-mm-forest uppercase tracking-wide">
              Condition
            </label>
            <select
              id={`condition-${card.id}`}
              value={selectedVariationKey}
              onChange={onVariationChange}
              className="input-mm w-full text-sm lg:text-sm"
              style={{ minHeight: `${ACCESSIBILITY_CONFIG.MIN_TOUCH_TARGET}px` }}
            >
              {card.variations.map((variation) => (
                <option key={`${card.id}-${variation.variation_key}`} value={variation.variation_key}>
                  {variation.quality}
                  {variation.foil_type !== 'Regular' ? ` ✨` : ''}
                  {variation.language && variation.language !== 'English' ? ` • ${variation.language}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Availability */}
          <div className="flex items-center gap-2 pb-2 lg:pb-3 border-b border-mm-warmAccent flex-shrink-0" aria-live="polite">
            {inStock ? (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true" />
                <span className="text-xs lg:text-sm text-mm-forest font-medium">
                  {effectiveVariation.stock} in stock
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
                <span className="text-xs lg:text-sm text-red-600 font-medium">Out of stock</span>
              </>
            )}
          </div>

          {/* Price & Action */}
          <div className="flex items-center justify-between gap-3 mt-auto">
            <span className="text-xl lg:text-2xl font-bold text-mm-darkForest">
              {currency.symbol}{price}
            </span>
            <button
              onClick={onAddToCart}
              disabled={!inStock}
              className="btn-mm-primary text-xs lg:text-sm px-3 py-2 lg:px-4 lg:py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: `${ACCESSIBILITY_CONFIG.MIN_TOUCH_TARGET}px` }}
              aria-label={`Add ${card.name} to cart`}
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // ✅ FIX: Improved comparison with proper null checks
    const prevVar = prevProps.selectedVariation;
    const nextVar = nextProps.selectedVariation;
    
    return (
      prevProps.card.id === nextProps.card.id &&
      prevProps.selectedVariationKey === nextProps.selectedVariationKey &&
      prevProps.currency.symbol === nextProps.currency.symbol &&
      prevProps.currency.rate === nextProps.currency.rate &&
      prevVar?.id === nextVar?.id &&
      prevVar?.price === nextVar?.price &&
      prevVar?.stock === nextVar?.stock &&
      prevVar?.quality === nextVar?.quality &&
      prevVar?.foil_type === nextVar?.foil_type &&
      prevVar?.language === nextVar?.language
    );
  }
);

CardItem.displayName = 'CardItem';
export default CardItem;