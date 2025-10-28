// apps/web/src/features/shop/components/CardDisplay/CardItem.tsx
/**
 * Card Item Component - REFACTORED FOR NEW ARCHITECTURE
 * Displays individual card with variation selection
 * 
 * NEW ARCHITECTURE:
 * - Admin mode: Cards have metadata directly, no variation selector needed
 * - Storefront mode: Cards have variations array for quality/foil/language selection
 * - Adapts display based on isAdminMode prop
 */
import React from 'react';
import OptimizedImage from '@/shared/media/OptimizedImage';
import VariationBadge from '@/shared/ui/VariationBadge';
import { ACCESSIBILITY_CONFIG } from '@/lib/constants';
import { formatCurrencySimple } from '@/lib/utils';
import type {
  Card,
  CardVariation,
  Currency
} from '@/types';
import {
  formatTreatment,
  formatFinish,
  isFoilCard,
  hasSpecialTreatment
} from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export type CardItemProps = {
  card: Card;
  selectedVariationKey: string | null;
  selectedVariation?: CardVariation | null;
  currency: Currency;
  onVariationChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onAddToCart: () => void;
  isAdminMode?: boolean;  // NEW: Determines rendering mode
};

// ============================================================================
// COMPONENT
// ============================================================================

const CardItem = React.memo<CardItemProps>(
  ({ 
    card, 
    selectedVariationKey, 
    selectedVariation, 
    currency, 
    onVariationChange, 
    onAddToCart,
    isAdminMode = false 
  }) => {
    const imageUrl = card.image_url || '/images/card-back-placeholder.svg';
    
    // ========================================================================
    // ADMIN MODE RENDERING
    // ========================================================================
    if (isAdminMode) {
      // Admin cards have metadata directly, no variation selector
      const isCardFoil = isFoilCard(card);
      const hasSpecial = hasSpecialTreatment(card);
      const totalStock = card.total_stock || 0;
      const hasStock = totalStock > 0;

      return (
        <div className="card-mm flex flex-row lg:flex-col h-full">
          {/* Image */}
          <div className="relative flex-shrink-0 w-28 sm:w-36 lg:w-full overflow-hidden rounded-mm-sm">
            <OptimizedImage
              src={imageUrl}
              alt={card.name}
              width={250}
              height={350}
              className={`w-full h-32 sm:h-44 lg:h-64 object-cover bg-gradient-to-br from-mm-warmAccent to-mm-tealLight ${
                isCardFoil
                  ? 'ring-2 ring-yellow-400 ring-offset-2 shadow-yellow-200/50 shadow-lg'
                  : ''
              }`}
              placeholder="blur"
              sizes="(max-width: 640px) 128px, (max-width: 1024px) 192px, 100%"
            />
            {/* Variation badges using VariationBadge component */}
            <div className="absolute top-1 left-1 lg:top-2 lg:left-2 flex flex-col gap-1">
              {isCardFoil && (
                <VariationBadge
                  finish={formatFinish(card.finish)}
                />
              )}
              {hasSpecial && (
                <VariationBadge
                  finish=""
                  treatment={formatTreatment(card.treatment)}
                />
              )}
              {card.promo_type && (
                <VariationBadge
                  finish=""
                  promoType={card.promo_type}
                />
              )}
            </div>
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

            {/* Variation Metadata */}
            <div className="space-y-1 lg:space-y-2 flex-shrink-0">
              <h4 className="block text-xs font-semibold text-mm-forest uppercase tracking-wide">
                Card Details
              </h4>
              <div className="flex flex-wrap gap-1">
                {card.treatment && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    hasSpecial 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {formatTreatment(card.treatment)}
                  </span>
                )}
                {card.finish && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    isCardFoil 
                      ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {formatFinish(card.finish)}
                  </span>
                )}
                {card.border_color && card.border_color !== 'black' && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    {card.border_color.charAt(0).toUpperCase() + card.border_color.slice(1)} Border
                  </span>
                )}
                {card.promo_type && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-pink-100 text-pink-700">
                    🎁 Promo
                  </span>
                )}
              </div>
            </div>

            {/* Stock Info */}
            <div className="flex items-center gap-2 pb-2 lg:pb-3 border-b border-mm-warmAccent flex-shrink-0" aria-live="polite">
              {hasStock ? (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true" />
                  <span className="text-xs lg:text-sm text-mm-forest font-medium">
                    {totalStock} in stock
                    {card.variation_count && card.variation_count > 1 && (
                      <span className="text-mm-teal ml-1">
                        ({card.variation_count} variations)
                      </span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-gray-400 rounded-full" aria-hidden="true" />
                  <span className="text-xs lg:text-sm text-gray-600 font-medium">No inventory</span>
                </>
              )}
            </div>

            {/* Action */}
            <div className="flex items-center justify-end gap-3 mt-auto">
              <button
                onClick={onAddToCart}
                className="btn-mm-primary text-xs lg:text-sm px-3 py-2 lg:px-4 lg:py-2"
                style={{ minHeight: `${ACCESSIBILITY_CONFIG.MIN_TOUCH_TARGET}px` }}
                aria-label={`Add ${card.name} to inventory`}
              >
                Add to Inventory
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ========================================================================
    // STOREFRONT MODE RENDERING
    // ========================================================================
    
    // Validate that we have a selected variation for storefront mode
    const effectiveVariation = selectedVariation || card.variations?.[0];
    
    // If no variation in storefront mode, show error
    if (!effectiveVariation || !card.variations || card.variations.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`CardItem: No variation available for card ${card.id} "${card.name}"`);
      }
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

    // Safe price calculation
    const price =
      effectiveVariation && typeof effectiveVariation.price === 'number'
        ? formatCurrencySimple(effectiveVariation.price, currency)
        : formatCurrencySimple(0, currency);

    // Safe stock check
    const inStock = (effectiveVariation?.stock ?? 0) > 0;

    // Safe foil type check
    const foilType = effectiveVariation?.foil_type || 'Regular';
    const isVariationFoil = foilType !== 'Regular';

    return (
      <div className="card-mm flex flex-row lg:flex-col h-full">
        {/* Image */}
        <div className="relative flex-shrink-0 w-28 sm:w-36 lg:w-full overflow-hidden rounded-mm-sm">
          <OptimizedImage
            src={imageUrl}
            alt={card.name}
            width={250}
            height={350}
            className={`w-full h-32 sm:h-44 lg:h-64 object-cover bg-gradient-to-br from-mm-warmAccent to-mm-tealLight ${
              isVariationFoil
                ? 'ring-2 ring-yellow-400 ring-offset-2 shadow-yellow-200/50 shadow-lg'
                : ''
            }`}
            placeholder="blur"
            sizes="(max-width: 640px) 128px, (max-width: 1024px) 192px, 100%"
          />
          {isVariationFoil && (
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

          {/* Condition Selector */}
          <div className="space-y-1 lg:space-y-2 flex-shrink-0">
            <label htmlFor={`condition-${card.id}`} className="block text-xs font-semibold text-mm-forest uppercase tracking-wide">
              Condition
            </label>
            <select
              id={`condition-${card.id}`}
              value={selectedVariationKey || ''}
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
              {price}
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
    // Memoization comparison
    const prevVar = prevProps.selectedVariation;
    const nextVar = nextProps.selectedVariation;
    
    return (
      prevProps.card.id === nextProps.card.id &&
      prevProps.selectedVariationKey === nextProps.selectedVariationKey &&
      prevProps.currency.symbol === nextProps.currency.symbol &&
      prevProps.currency.rate === nextProps.currency.rate &&
      prevProps.isAdminMode === nextProps.isAdminMode &&
      prevVar?.inventory_id === nextVar?.inventory_id &&
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