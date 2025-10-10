import React from 'react';
import PropTypes from 'prop-types';
import OptimizedImage from '../OptimizedImage';

/**
 * List Card Item Component for List View
 * Responsive component optimized for compact list display with mobile-first design
 */
const ListCardItem = React.memo(({
  card,
  selectedVariationKey,
  selectedVariation,
  currency,
  onVariationChange,
  onAddToCart
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all motion-reduce:transition-none border border-slate-200">
      <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
        {/* Card Thumbnail - Fixed small size */}
        <div className="relative w-12 h-16 sm:w-16 sm:h-24 flex-shrink-0">
          <OptimizedImage
            src={card.image_url}
            alt={`${card.name} from ${card.set_name}`}
            width={80}
            height={112}
            className="bg-gradient-to-br from-slate-100 to-slate-200 w-full h-full object-cover rounded"
            placeholder="blur"
            sizes="80px"
          />
        </div>

        {/* Card Info - Flexible with overflow handling */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm sm:text-base text-slate-900 truncate mb-0.5">
            {card.name}
          </h3>
          <p className="text-xs text-slate-600 truncate">
            {card.set_name} • #{card.card_number}
          </p>

          {/* Stock indicator - Mobile only */}
          <div className="flex items-center gap-1.5 mt-1 sm:hidden">
            <div className={`w-1.5 h-1.5 rounded-full ${
              selectedVariation?.stock > 0 ? 'bg-emerald-500' : 'bg-slate-400'
            }`}></div>
            <span className={`text-xs font-medium ${
              selectedVariation?.stock > 0 ? 'text-emerald-700' : 'text-slate-500'
            }`}>
              {selectedVariation?.stock > 0
                ? `${selectedVariation.stock} in stock`
                : 'Out of stock'
              }
            </span>
          </div>
        </div>

        {/* Desktop-only responsive columns - Fully flexible, no fixed widths */}
        <div className="hidden sm:flex items-center gap-2 lg:gap-3 flex-shrink-0 min-w-0">
          {/* Condition Selector - Flexible, takes available space */}
          <select
            id={`condition-list-${card.id}`}
            value={selectedVariationKey}
            onChange={onVariationChange}
            className="flex-shrink-0 min-w-[100px] max-w-[160px] text-xs lg:text-sm px-2 py-2 border-2 border-slate-300 rounded-md bg-white hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-colors"
          >
            {card.variations.map(variation => (
              <option key={`${card.id}-${variation.variation_key}`} value={variation.variation_key}>
                {variation.quality}
                {variation.foil_type !== 'Regular' ? ` • ${variation.foil_type.slice(0,1)}` : ''}
              </option>
            ))}
          </select>

          {/* Stock - Compact, flexible */}
          <div className="flex items-center gap-1 flex-shrink-0 min-w-[32px]">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              selectedVariation?.stock > 0 ? 'bg-emerald-500' : 'bg-slate-400'
            }`}></div>
            <span className={`text-xs font-medium whitespace-nowrap ${
              selectedVariation?.stock > 0 ? 'text-emerald-700' : 'text-slate-500'
            }`}>
              {selectedVariation?.stock > 0 ? selectedVariation.stock : '0'}
            </span>
          </div>

          {/* Price - Flexible but doesn't shrink below content */}
          <div className="text-right flex-shrink-0 min-w-[60px]">
            <span className="text-sm lg:text-base font-bold text-slate-900 block leading-none whitespace-nowrap">
              {currency.symbol}{(selectedVariation?.price * currency.rate).toFixed(2)}
            </span>
            {selectedVariation?.stock <= 3 && selectedVariation?.stock > 0 && (
              <span className="text-xs font-semibold text-red-600 block mt-0.5 whitespace-nowrap">
                {selectedVariation.stock} left
              </span>
            )}
          </div>

          {/* Add to Cart Button - Flexible */}
          <button
            onClick={onAddToCart}
            disabled={!selectedVariation || selectedVariation.stock === 0}
            className="px-3 lg:px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-all motion-reduce:transition-none focus:ring-4 focus:ring-blue-500/50 focus:outline-none shadow-sm hover:shadow-md disabled:shadow-none min-h-[44px] flex-shrink-0 whitespace-nowrap"
            aria-label={`Add ${card.name} to cart`}
          >
            <span className="hidden lg:inline">Add to Cart</span>
            <span className="lg:hidden">Add</span>
          </button>
        </div>

        {/* Mobile-only Add button */}
        <div className="sm:hidden flex-shrink-0">
          <button
            onClick={onAddToCart}
            disabled={!selectedVariation || selectedVariation.stock === 0}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-all motion-reduce:transition-none focus:ring-4 focus:ring-blue-500/50 focus:outline-none shadow-sm hover:shadow-md disabled:shadow-none min-h-[44px] whitespace-nowrap"
            aria-label={`Add ${card.name} to cart`}
          >
            Add
          </button>
        </div>
      </div>

      {/* Condition selector for mobile - Expandable section */}
      <div className="sm:hidden border-t border-slate-100 px-3 py-2 bg-slate-50">
        <label
          htmlFor={`condition-list-mobile-${card.id}`}
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1"
        >
          Condition
        </label>
        <select
          id={`condition-list-mobile-${card.id}`}
          value={selectedVariationKey}
          onChange={onVariationChange}
          className="w-full text-sm px-2.5 py-2 border-2 border-slate-300 rounded-md bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none"
        >
          {card.variations.map(variation => (
            <option key={`${card.id}-${variation.variation_key}`} value={variation.variation_key}>
              {variation.quality}
              {variation.foil_type !== 'Regular' ? ` • ${variation.foil_type}` : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  // Same optimized comparison as CardItem
  const prevVar = prevProps.selectedVariation;
  const nextVar = nextProps.selectedVariation;

  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.selectedVariationKey === nextProps.selectedVariationKey &&
    prevProps.currency.symbol === nextProps.currency.symbol &&
    prevProps.currency.rate === nextProps.currency.rate &&
    // Compare selectedVariation properties individually
    prevVar?.id === nextVar?.id &&
    prevVar?.price === nextVar?.price &&
    prevVar?.stock === nextVar?.stock &&
    prevVar?.quality === nextVar?.quality &&
    prevVar?.foil_type === nextVar?.foil_type &&
    prevVar?.language === nextVar?.language
  );
});

ListCardItem.displayName = 'ListCardItem';

ListCardItem.propTypes = {
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

export default ListCardItem;