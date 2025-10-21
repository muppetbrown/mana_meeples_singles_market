// apps/web/src/components/common/RecentlyViewedCards.tsx
import React from 'react';
import { Clock, X } from 'lucide-react';
import OptimizedImage from '@/shared/components/media/OptimizedImage';

type ViewedCard = {
  id: string | number;
  name: string;
  image_url: string;
  set_name: string;
  card_number?: string;
  game_name?: string;
  viewedAt?: string;
};

type Currency = {
  symbol: string;
  code: string;
};

type Props = {
  recentlyViewed: ViewedCard[];
  onCardClick: (card: ViewedCard) => void;
  onRemoveCard: (id: ViewedCard['id']) => void;
  onClearAll: () => void;
  currency?: Currency;
};

const RecentlyViewedCards: React.FC<Props> = ({
  recentlyViewed,
  onCardClick,
  onRemoveCard,
  onClearAll,
}) => {
  if (!recentlyViewed.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-600" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-slate-900">Recently Viewed</h3>
          <span className="text-xs text-slate-500" aria-live="polite">
            ({recentlyViewed.length})
          </span>
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
            role="button"
            tabIndex={0}
            aria-label={`Open ${card.name}`}
            onClick={() => onCardClick(card)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onCardClick(card);
              }
            }}
          >
            {/* Remove */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveCard(card.id);
              }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 focus:ring-2 focus:ring-red-500 focus:outline-none"
              aria-label={`Remove ${card.name} from recently viewed`}
              title="Remove"
            >
              <X className="w-3 h-3" aria-hidden="true" />
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
                <p className="text-xs text-slate-600 truncate">{card.set_name}</p>
                {card.game_name && (
                  <p className="text-xs text-slate-500 truncate mt-1">{card.game_name}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 text-xs text-slate-500">
        Click a card to search for it, or hover and click × to remove
      </div>
    </div>
  );
};

export default RecentlyViewedCards;
