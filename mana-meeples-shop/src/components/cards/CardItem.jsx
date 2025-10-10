import React from 'react';
import PropTypes from 'prop-types';
import OptimizedImage from '../OptimizedImage';
import { ACCESSIBILITY_CONFIG } from '../../config/constants';

/**
 * Card Item Component for Grid View
 * Displays card information in a responsive grid layout optimized for different screen sizes
 */
const CardItem = React.memo(({
  card,
  selectedVariationKey,
  selectedVariation,
  currency,
  onVariationChange,
  onAddToCart
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all motion-reduce:transition-none overflow-hidden border border-slate-200 flex flex-row lg:flex-col h-full">
      {/* Card Image - Left on mobile, top on desktop */}
      <div className="relative flex-shrink-0 w-28 sm:w-36 lg:w-full">
        <OptimizedImage
          src={card.image_url}
          alt={`${card.name} from ${card.set_name}`}
          width={250}
          height={350}
          className={`w-full h-32 sm:h-44 lg:h-64 object-cover bg-gradient-to-br from-slate-100 to-slate-200 ${
            selectedVariation?.foil_type !== 'Regular'
              ? 'ring-2 ring-yellow-400 ring-offset-2 shadow-yellow-200/50 shadow-lg'
              : ''
          }`}
          placeholder="blur"
          sizes="(max-width: 640px) 128px, (max-width: 1024px) 192px, 100%"
        />
        {/* Foil Badge */}
        {selectedVariation?.foil_type !== 'Regular' && (
          <div className="absolute top-1 left-1 lg:top-2 lg:left-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs font-bold px-1.5 py-0.5 lg:px-2 lg:py-1 rounded-full shadow-md border border-yellow-300">
            ✨ {selectedVariation.foil_type}
          </div>
        )}
      </div>

      {/* Card Content - Right on mobile, bottom on desktop */}
      <div className="p-4 sm:p-5 lg:p-5 flex flex-col gap-3 lg:gap-3 flex-grow min-w-0">
        {/* Title & Set Info */}
        <div className="flex-shrink-0">
          <h3 className="font-semibold text-sm lg:text-lg leading-tight text-slate-900 mb-1 lg:mb-2 line-clamp-2">
            {card.name}
          </h3>
          <p className="text-xs lg:text-sm text-slate-600 pb-2 lg:pb-3 border-b border-slate-100">
            {card.set_name} • #{card.card_number}
          </p>
        </div>

        {/* Condition Selector */}
        <div className="space-y-1 lg:space-y-2 flex-shrink-0">
          <label
            htmlFor={`condition-${card.id}`}
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wide"
          >
            Condition
          </label>
          <select
            id={`condition-${card.id}`}
            value={selectedVariationKey}
            onChange={onVariationChange}
            className={`w-full text-sm lg:text-sm px-3 lg:px-3 py-2.5 lg:py-2.5 border-2 border-slate-300 rounded-lg bg-white hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-colors`}
            style={{ minHeight: `${ACCESSIBILITY_CONFIG.MIN_TOUCH_TARGET}px` }}
          >
            {card.variations.map(variation => (
              <option key={`${card.id}-${variation.variation_key}`} value={variation.variation_key}>
                {variation.quality}
                {variation.foil_type !== 'Regular' ? ` ✨` : ''}
                {variation.language !== 'English' ? ` • ${variation.language}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Availability Status */}
        <div className="flex items-center gap-2 pb-2 lg:pb-3 border-b border-slate-100 flex-shrink-0">
          {selectedVariation?.stock > 0 ? (
            <>
              <div className="w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-emerald-500"></div>
              <span className="text-xs lg:text-sm font-medium text-emerald-700">
                {selectedVariation.stock} left
              </span>
            </>
          ) : (
            <>
              <div className="w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-slate-400"></div>
              <span className="text-xs lg:text-sm font-medium text-slate-500">Out of stock</span>
            </>
          )}
        </div>

        {/* Price & CTA Section - Pushed to bottom */}
        <div className="mt-auto pt-1 lg:pt-2">
          {/* Price Display */}
          <div className="mb-2 lg:mb-3">
            <div className="text-lg lg:text-2xl font-bold text-slate-900 leading-none mb-1">
              {currency.symbol}{(selectedVariation?.price * currency.rate).toFixed(2)}
            </div>
            {selectedVariation?.stock <= 3 && selectedVariation?.stock > 0 && (
              <div className="text-xs font-semibold text-red-600">
                Only {selectedVariation.stock} left!
              </div>
            )}
          </div>

          {/* Add to Cart Button - Full Width */}
          <button
            onClick={onAddToCart}
            disabled={!selectedVariation || selectedVariation.stock === 0}
            className="w-full px-3 lg:px-4 py-2 lg:py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm lg:text-base font-semibold rounded-lg transition-all motion-reduce:transition-none focus:ring-4 focus:ring-blue-500/50 focus:outline-none shadow-sm hover:shadow-md disabled:shadow-none"
            style={{ minHeight: `${ACCESSIBILITY_CONFIG.MIN_TOUCH_TARGET}px` }}
            aria-label={`Add ${card.name} to cart`}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  // Avoid expensive JSON.stringify - use specific property comparison instead
  const prevVar = prevProps.selectedVariation;
  const nextVar = nextProps.selectedVariation;

  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.selectedVariationKey === nextProps.selectedVariationKey &&
    prevProps.currency.symbol === nextProps.currency.symbol &&
    prevProps.currency.rate === nextProps.currency.rate &&
    // Compare selectedVariation properties individually (much faster than JSON.stringify)
    prevVar?.id === nextVar?.id &&
    prevVar?.price === nextVar?.price &&
    prevVar?.stock === nextVar?.stock &&
    prevVar?.quality === nextVar?.quality &&
    prevVar?.foil_type === nextVar?.foil_type &&
    prevVar?.language === nextVar?.language
  );
});

CardItem.displayName = 'CardItem';

CardItem.propTypes = {
  card: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    image_url: PropTypes.string.isRequired,
    set_name: PropTypes.string.isRequired,
    card_number: PropTypes.string,
    variations: PropTypes.arrayOf(PropTypes.shape({
      variation_key: PropTypes.string.isRequired,
      quality: PropTypes.string.isRequired,
      foil_type: PropTypes.string,
      language: PropTypes.string,
      price: PropTypes.number.isRequired,
      stock: PropTypes.number.isRequired,
    })).isRequired,
  }).isRequired,
  selectedVariationKey: PropTypes.string.isRequired,
  selectedVariation: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    price: PropTypes.number,
    stock: PropTypes.number,
    quality: PropTypes.string,
    foil_type: PropTypes.string,
    language: PropTypes.string,
  }),
  currency: PropTypes.shape({
    symbol: PropTypes.string.isRequired,
    rate: PropTypes.number.isRequired,
  }).isRequired,
  onVariationChange: PropTypes.func.isRequired,
  onAddToCart: PropTypes.func.isRequired,
};

export default CardItem;