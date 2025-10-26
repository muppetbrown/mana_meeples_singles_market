// apps/web/src/features/shop/components/RecentlyViewedCards.tsx
import React from 'react';
import { Clock, X } from 'lucide-react';
import { OptimizedImage } from '@/shared/media';
import { useRecentlyViewed } from '@/features/hooks';
import type { Card } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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
  rate: number;
};

type Props = {
  onCardClick?: (card: ViewedCard) => void;
  currency?: Currency;
  className?: string;
};

// ---------------------------------------------------------------------------
// Component: RecentlyViewedCards
// ---------------------------------------------------------------------------
export const RecentlyViewedCards: React.FC<Props> = ({
  onCardClick,
  className = '',
}) => {
  const { items, removeCard, clearAll } = useRecentlyViewed();

  // Convert Card[] to ViewedCard[] for the component
  const recentlyViewed: ViewedCard[] = items.map(card => ({
    id: card.id,
    name: card.name,
    image_url: card.image_url || '',
    set_name: card.set_name,
    card_number: card.card_number,
    game_name: card.game_name,
  }));

  if (!recentlyViewed.length) return null;

  const handleCardClick = (card: ViewedCard) => {
    if (onCardClick) {
      onCardClick(card);
    } else {
      // Default behavior: trigger a search for this card
      const searchParams = new URLSearchParams();
      searchParams.set('search', card.name);
      if (card.set_name) {
        searchParams.set('set', card.set_name);
      }
      window.history.pushState({}, '', `?${searchParams.toString()}`);
      window.location.reload();
    }
  };

  return (
    <section
      aria-label="Recently viewed cards"
      className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 ${className}`}
    >
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-600" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-slate-900">Recently Viewed</h3>
          <span
            className="text-xs text-slate-500"
            aria-live="polite"
          >
            ({recentlyViewed.length})
          </span>
        </div>
        <button
          onClick={clearAll}
          className="text-xs text-slate-500 hover:text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded px-2 py-1 transition-colors"
          aria-label="Clear all recently viewed cards"
        >
          Clear All
        </button>
      </header>

      <ul
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin"
        role="list"
      >
        {recentlyViewed.map((card) => (
          <li
            key={card.id}
            className="flex-shrink-0 group cursor-pointer relative"
          >
            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeCard(Number(card.id));
              }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 focus:ring-2 focus:ring-red-500 focus:outline-none"
              aria-label={`Remove ${card.name} from recently viewed`}
              title="Remove"
            >
              <X className="w-3 h-3" aria-hidden="true" />
            </button>

            {/* Card preview */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleCardClick(card)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(card);
                }
              }}
              aria-label={`Open ${card.name}`}
              className="bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden w-20"
            >
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
                {card.card_number && (
                  <p className="text-xs text-slate-500 truncate">#{card.card_number}</p>
                )}
                {card.game_name && (
                  <p className="text-xs text-slate-500 truncate mt-1">{card.game_name}</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs text-slate-500">
        Click a card to search for it, or hover and click × to remove.
      </p>
    </section>
  );
};

export default RecentlyViewedCards;