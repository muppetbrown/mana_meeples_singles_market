import React from 'react';
import PropTypes from 'prop-types';
import { Clock, X } from 'lucide-react';
import OptimizedImage from '../OptimizedImage';

/**
 * Recently Viewed Cards Component
 * Displays a horizontal list of recently viewed cards with quick access functionality
 */
const RecentlyViewedCards = ({
  recentlyViewed,
  onCardClick,
  onRemoveCard,
  onClearAll,
  currency
}) => {
  if (recentlyViewed.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-900">Recently Viewed</h3>
          <span className="text-xs text-slate-500">({recentlyViewed.length})</span>
        </div>
        <button
          onClick={onClearAll}
          className="text-xs text-slate-500 hover:text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded px-2 py-1"
          aria-label="Clear all recently viewed cards"
        >
          Clear All
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
        {recentlyViewed.map((card) => (
          <div
            key={card.id}
            className="flex-shrink-0 group cursor-pointer relative"
            onClick={() => onCardClick(card)}
          >
            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveCard(card.id);
              }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 focus:ring-2 focus:ring-red-500 focus:outline-none"
              aria-label={`Remove ${card.name} from recently viewed`}
            >
              <X className="w-3 h-3" />
            </button>

            <div className="bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden w-20">
              <OptimizedImage
                src={card.image_url}
                alt={`${card.name} from ${card.set_name}`}
                width={80}
                height={112}
                className="w-full h-24 object-cover"
                placeholder="blur"
                sizes="80px"
              />
              <div className="p-2">
                <h4 className="text-xs font-medium text-slate-900 line-clamp-2 leading-tight mb-1">
                  {card.name}
                </h4>
                <p className="text-xs text-slate-600 truncate">
                  {card.set_name}
                </p>
                {card.game_name && (
                  <p className="text-xs text-slate-500 truncate mt-1">
                    {card.game_name}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 text-xs text-slate-500">
        Click on any card to search for it, or hover and click × to remove
      </div>
    </div>
  );
};

RecentlyViewedCards.propTypes = {
  recentlyViewed: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    image_url: PropTypes.string.isRequired,
    set_name: PropTypes.string.isRequired,
    card_number: PropTypes.string,
    game_name: PropTypes.string,
    viewedAt: PropTypes.string,
  })).isRequired,
  onCardClick: PropTypes.func.isRequired,
  onRemoveCard: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
  currency: PropTypes.shape({
    symbol: PropTypes.string.isRequired,
    code: PropTypes.string.isRequired,
  }),
};

RecentlyViewedCards.defaultProps = {
  currency: { symbol: 'NZ$', code: 'NZD' },
};

export default RecentlyViewedCards;