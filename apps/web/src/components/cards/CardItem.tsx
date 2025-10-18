import React from 'react';
import OptimizedImage from '../OptimizedImage';
import { ACCESSIBILITY_CONFIG } from '../../config/constants';

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
  image_url: string;
  set_name: string;
  card_number?: string;
  variations: Variation[];
};

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
    const price =
      selectedVariation && typeof selectedVariation.price === 'number'
        ? (selectedVariation.price * currency.rate).toFixed(2)
        : (0).toFixed(2);

    const inStock = (selectedVariation?.stock ?? 0) > 0;

    return (
      <div className="card-mm flex flex-row lg:flex-col h-full">
        {/* Image */}
        <div className="relative flex-shrink-0 w-28 sm:w-36 lg:w-full">
          <OptimizedImage
            src={card.image_url}
            alt={`${card.name} from ${card.set_name}`}
            width={250}
            height={350}
            className={`w-full h-32 sm:h-44 lg:h-64 object-cover bg-gradient-to-br from-mm-warmAccent to-mm-tealLight ${
              selectedVariation?.foil_type !== 'Regular'
                ? 'ring-2 ring-yellow-400 ring-offset-2 shadow-yellow-200/50 shadow-lg'
                : ''
            }`}
            placeholder="blur"
            sizes="(max-width: 640px) 128px, (max-width: 1024px) 192px, 100%"
          />
          {selectedVariation?.foil_type !== 'Regular' && (
            <div className="absolute top-1 left-1 lg:top-2 lg:left-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs font-bold px-1.5 py-0.5 lg:px-2 lg:py-1 rounded-mm-sm shadow-md border border-yellow-300">
              ✨ {selectedVariation.foil_type}
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
                <div className="w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-emerald-500" aria-hidden="true" />
                <span className="text-xs lg:text-sm font-medium text-emerald-700">{selectedVariation?.stock} left</span>
              </>
            ) : (
              <>
                <div className="w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-mm-teal" aria-hidden="true" />
                <span className="text-xs lg:text-sm font-medium text-mm-teal">Out of stock</span>
              </>
            )}
          </div>

          {/* Price & CTA */}
          <div className="mt-auto pt-1 lg:pt-2">
            <div className="mb-2 lg:mb-3" aria-live="polite">
              <div className="text-lg lg:text-2xl font-bold text-mm-darkForest leading-none mb-1">
                {currency.symbol}
                {price}
              </div>
              {inStock && (selectedVariation?.stock ?? 0) <= 3 && (
                <div className="text-xs font-semibold text-red-600">Only {selectedVariation?.stock} left!</div>
              )}
            </div>

            <button
              onClick={onAddToCart}
              disabled={!inStock}
              className="btn-mm-primary w-full text-sm lg:text-base disabled:bg-mm-teal disabled:cursor-not-allowed disabled:shadow-none"
              style={{ minHeight: `${ACCESSIBILITY_CONFIG.MIN_TOUCH_TARGET}px` }}
              aria-label={`Add ${card.name} to cart`}
              aria-disabled={!inStock}
            >
              Add to Cart
            </button>
          </div>
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
      pv?.id === nv?.id &&
      pv?.price === nv?.price &&
      pv?.stock === nv?.stock &&
      pv?.quality === nv?.quality &&
      pv?.foil_type === nv?.foil_type &&
      pv?.language === nv?.language
    );
  }
);

CardItem.displayName = 'CardItem';
export default CardItem;
