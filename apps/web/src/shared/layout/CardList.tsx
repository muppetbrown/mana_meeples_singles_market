// apps/web/src/shared/layout/CardList.tsx
/**
 * Card List Component - IMPLEMENTATION OF NEW ARCHITECTURE
 * Displays cards in list/table view with variation badges
 *
 * ARCHITECTURE:
 * - List view: Table rows with variation badges (no dropdowns)
 * - Adapts display based on mode: storefront/inventory/all
 * - Shows treatment + finish + stock count per variation
 * - Action button opens modal for quality/language selection
 */
import React from 'react';
import OptimizedImage from '@/shared/media/OptimizedImage';
import { formatCurrencySimple } from '@/lib/utils';
import type {
  BrowseBaseCard,
  BrowseVariation,
  Currency
} from '@/types';
import {
  formatTreatment,
  formatFinish
} from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export interface CardListProps {
  cards: BrowseBaseCard[];
  mode: 'storefront' | 'inventory' | 'all';
  currency?: Currency;
  onAction: (card: BrowseBaseCard, variation?: BrowseVariation) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

const CardList: React.FC<CardListProps> = ({
  cards,
  mode,
  currency = { code: 'USD', symbol: '$', rate: 1, label: 'US Dollar' },
  onAction
}) => {
  // --------------------------------------------------------------------------
  // VARIATION FILTERING HELPERS
  // --------------------------------------------------------------------------

  const getVisibleVariations = (card: BrowseBaseCard): BrowseVariation[] => {
    if (mode === 'all') {
      return card.variations; // Show all variations
    }
    // inventory/storefront: only variations with stock
    return card.variations.filter(v => v.in_stock > 0);
  };

  const formatVariationLabel = (variation: BrowseVariation, includeStock: boolean): string => {
    const treatment = formatTreatment(variation.treatment);
    const finish = formatFinish(variation.finish);
    const label = `${treatment} ${finish}`;

    if (includeStock && mode !== 'all') {
      return `${label} (${variation.in_stock} in stock)`;
    }

    return label;
  };

  // --------------------------------------------------------------------------
  // ACTION BUTTON HELPERS
  // --------------------------------------------------------------------------

  const getActionButtonText = (): string => {
    switch (mode) {
      case 'all': return 'Add to Inventory';
      case 'inventory': return 'Manage';
      default: return 'Add to Cart';
    }
  };

  // --------------------------------------------------------------------------
  // RENDER HELPERS
  // --------------------------------------------------------------------------

  const renderVariationBadges = (card: BrowseBaseCard) => {
    const visibleVariations = getVisibleVariations(card);

    if (visibleVariations.length === 0) {
      return (
        <div className="text-sm text-slate-500 italic">
          No variations available
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {visibleVariations.map(variation => (
          <div
            key={variation.id}
            className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium border border-slate-200"
          >
            <span>
              {formatVariationLabel(variation, mode !== 'all')}
            </span>
            {variation.price && mode !== 'all' && (
              <span className="text-xs text-slate-600">
                {formatCurrencySimple(variation.price, currency)}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderPriceInfo = (card: BrowseBaseCard) => {
    if (mode === 'all' || !card.lowest_price) {
      return null;
    }

    return (
      <span className="text-sm text-slate-600">
        From {formatCurrencySimple(card.lowest_price, currency)}
      </span>
    );
  };

  // --------------------------------------------------------------------------
  // MAIN RENDER
  // --------------------------------------------------------------------------

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>No cards to display</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Image
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Game
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Set
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Rarity
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Variations
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {cards.map(card => {
              const visibleVariations = getVisibleVariations(card);
              const imageUrl = card.image_url || '/images/card-back-placeholder.svg';

              return (
                <tr key={card.id} className="hover:bg-slate-50 transition-colors">
                  {/* Image */}
                  <td className="px-4 py-4">
                    <div className="w-12 h-16 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                      <OptimizedImage
                        src={imageUrl}
                        alt={card.name}
                        width={48}
                        height={64}
                        className="object-cover"
                        priority={false}
                      />
                    </div>
                  </td>

                  {/* Game */}
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {card.game_name || 'Unknown'}
                  </td>

                  {/* Set */}
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {card.set_name}
                  </td>

                  {/* Name */}
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-slate-900">
                      {card.name}
                    </div>
                  </td>

                  {/* Card Number */}
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {card.card_number || '—'}
                  </td>

                  {/* Rarity */}
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {card.rarity || '—'}
                  </td>

                  {/* Variations */}
                  <td className="px-4 py-4">
                    <div className="max-w-xs">
                      {renderVariationBadges(card)}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {renderPriceInfo(card)}
                      <button
                        onClick={() => onAction(card, visibleVariations[0])}
                        disabled={mode !== 'all' && visibleVariations.length === 0}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          mode !== 'all' && visibleVariations.length === 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                        }`}
                        aria-label={`${getActionButtonText()} for ${card.name}`}
                      >
                        {getActionButtonText()}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

CardList.displayName = 'CardList';
export default CardList;