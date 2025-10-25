// ----------------------------------------------------------------------------
// File: apps/web/src/features/shop/components/CardDisplay/CardList.tsx
// Purpose: Uses catalog-layer grouping (groupCardsForBrowse) and presents
//          expandable variations; keeps Admin vs Shop mode behaviors.

import React from 'react';
import OptimizedImage from '@/shared/components/media/OptimizedImage';
import VariationBadge from '@/shared/components/ui/VariationBadge';
import { formatTreatment, formatFinish } from '@/types';
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import type { CardDBRow, BrowseBaseCard, BrowseVariation } from '@/lib/utils/groupCards';
import { groupCardsForBrowse } from '@/lib/utils/groupCards';

// ============================================================================
// TYPES
// ============================================================================

type Currency = {
  symbol: string;
  rate: number;
};

export type CardListProps = {
  cards: CardDBRow[]; // catalog rows only (no inventory quality/language here)
  currency: Currency;
  isAdminMode?: boolean;
  onAddToCart?: (card: CardDBRow, variation: BrowseVariation) => void; // shop only
  onAddToInventory?: (card: CardDBRow) => void;                        // admin only
  className?: string;
};

type ExpandedState = Record<string, boolean>; // key by group key sid:|num:

// ============================================================================
// COMPONENT
// ============================================================================

const CardList = React.memo<CardListProps>(({ cards, currency, isAdminMode = false, onAddToCart, onAddToInventory, className = '' }) => {
  const baseCards: BrowseBaseCard[] = React.useMemo(() => groupCardsForBrowse(cards), [cards]);

  // Filter based on mode
  const displayCards = React.useMemo(() => {
    if (isAdminMode) return baseCards; // show everything to admins
    // Shop mode: show only base cards with any stock > 0 across variations
    return baseCards.filter((card) => card.total_stock > 0 || card.variations.some(v => v.in_stock > 0));
  }, [baseCards, isAdminMode]);

  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  const toggle = (groupKey: string) => setExpanded(s => ({ ...s, [groupKey]: !s[groupKey] }));

  const formatPrice = (price: number | null | undefined) => {
    if (price == null) return 'N/A';
    return (price * currency.rate).toFixed(2);
  };

  if (displayCards.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-mm-teal">
          {isAdminMode ? 'No cards found.' : 'No cards with stock available.'}
        </p>
      </div>
    );
  }

  return (
    <ul className={`space-y-2 ${className}`} role="list" aria-label="Card results">
      {displayCards.map((card) => {
        const groupKey = `sid:${card.set_id}|num:${card.card_number}`;
        const isExpanded = !!expanded[groupKey];
        const hasVariations = (card.variation_count || 0) > 0;
        const imageUrl = card.image_url || card.image_uris?.small || card.image_uris?.normal || '/images/card-back-placeholder.jpg';
        const panelId = `${groupKey}-panel`;
        const btnId = `${groupKey}-button`;

        // Shop/Admin: both use computed variations; shop will show price/stock
        const availableVariations = isAdminMode
          ? card.variations
          : card.variations.filter(v => (v.in_stock || 0) > 0);

        return (
          <li key={groupKey} className="card-mm bg-white border border-mm-warmAccent hover:border-mm-teal transition-colors rounded-mm-sm">
            {/* Main row */}
            <div className="flex items-center p-1 gap-4">
              {/* Image */}
              <div className="relative flex-shrink-0 w-16 h-20 sm:w-20 sm:h-28">
                <OptimizedImage
                  src={imageUrl}
                  alt={`${card.name} (${card.set_name} #${card.card_number})`}
                  width={80}
                  height={112}
                  className="w-full h-full object-cover rounded-mm-sm bg-gradient-to-br from-mm-warmAccent to-mm-tealLight"
                  placeholder="blur"
                  sizes="80px"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base sm:text-lg text-mm-darkForest truncate mb-1">{card.name}</h3>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm text-mm-teal truncate">{card.set_name} · #{card.card_number}{card.rarity ? ` · ${card.rarity}` : ''}</p>
                  {/* Badges on the base card reflect the chosen base row; variations show more detail below */}
                  {(card.finish || card.treatment || card.promo_type) && (
                    <div className="flex gap-1">
                      {card.finish && (
                        <VariationBadge finish={formatFinish(card.finish)} />
                      )}
                      {card.treatment && (
                        <VariationBadge finish="" treatment={formatTreatment(card.treatment)} />
                      )}
                      {card.promo_type && (
                        <VariationBadge finish="" promoType={card.promo_type} />
                      )}
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="flex items-center gap-4 text-xs sm:text-sm text-mm-darkForest">
                  {!isAdminMode && (
                    <>
                      <span className="font-medium">{card.total_stock || 0} in stock</span>
                      <span>
                        {availableVariations.length} variation{availableVariations.length !== 1 ? 's' : ''}
                      </span>
                      {card.lowest_price != null && (
                        <span className="font-semibold">{currency.symbol}{formatPrice(card.lowest_price)}</span>
                      )}
                    </>
                  )}
                  {isAdminMode && (
                    <span className="font-medium">{hasVariations ? `${availableVariations.length} variation${availableVariations.length !== 1 ? 's' : ''}` : 'Base card'}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {isAdminMode && onAddToInventory && (
                  <button
                    onClick={() => onAddToInventory(card)}
                    className="btn-secondary p-2 sm:px-3 sm:py-2 text-xs sm:text-sm"
                    title="Add to inventory"
                  >
                    <PlusIcon className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Add to Inventory</span>
                  </button>
                )}

                {availableVariations.length > 0 && (
                  <button
                    id={btnId}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    onClick={() => toggle(groupKey)}
                    className="p-2 text-mm-teal hover:text-mm-darkForest transition-colors focus-visible:ring rounded"
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} variations for ${card.name}`}
                  >
                    {isExpanded ? (
                      <ChevronDownIcon className="w-10 h-10" />
                    ) : (
                      <ChevronRightIcon className="w-10 h-10" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Variations panel */}
            {isExpanded && availableVariations.length > 0 && (
              <div id={panelId} role="region" aria-labelledby={btnId} className="border-t border-mm-warmAccent bg-gray-50">
                <div className="p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-mm-darkForest mb-3">{isAdminMode ? 'Card Variations:' : 'Available Options:'}</h4>

                  <div className="space-y-2">
                    {availableVariations.map((v) => (
                      <div key={v.sku} className="flex items-center justify-between p-3 bg-white rounded-mm-sm border border-mm-warmAccent hover:border-mm-teal transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <VariationBadge
                              treatment={v.treatment}
                              finish={v.finish}
                              borderColor={v.border_color ?? undefined}
                              frameEffect={v.frame_effect ?? undefined}
                              promoType={v.promo_type ?? undefined}
                              ariaLabel={`${formatTreatment(v.treatment)} · ${formatFinish(v.finish)}`}
                            />
                            {typeof v.price === 'number' && (
                              <span className="text-sm font-medium text-mm-darkForest">{currency.symbol}{formatPrice(v.price)}</span>
                            )}
                          </div>
                          {!isAdminMode && (
                            <div className="flex items-center gap-4 text-xs text-mm-teal">
                              <span>Stock: {v.in_stock || 0}</span>
                            </div>
                          )}
                        </div>

                        {!isAdminMode && onAddToCart && (v.in_stock || 0) > 0 && (
                          <button
                            onClick={() => onAddToCart(card, v)}
                            className="btn-primary px-3 py-1.5 text-xs"
                            title="Add to cart"
                            aria-label={`Add ${card.name} ${formatTreatment(v.treatment)} ${formatFinish(v.finish)} to cart`}
                          >
                            <ShoppingCartIcon className="w-4 h-4 mr-1" />
                            Add to Cart
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {isAdminMode && availableVariations.length === 0 && (
                    <p className="text-sm text-mm-teal italic">No catalog variations available.</p>
                  )}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
});

CardList.displayName = 'CardList';

export default CardList;