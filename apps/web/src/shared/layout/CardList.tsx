// apps/web/src/shared/layout/CardList.tsx
/**
 * Card List Component - REFACTORED TO USE CARDROW
 * Displays cards in list/table view using CardRow component for each row
 *
 * ARCHITECTURE:
 * - Uses CardRow.tsx for consistent row rendering
 * - Converts BrowseBaseCard to CardIdentity for CardRow
 * - Generates variation badges using CardRow's badge system
 * - Passes action buttons via CardRow's rightNode prop
 */
import React from 'react';
import CardRow, { type CardIdentity, type VariationBadge } from '@/shared/card/CardRow';
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
  // DATA CONVERSION HELPERS
  // --------------------------------------------------------------------------

  const convertToCardIdentity = (card: BrowseBaseCard): CardIdentity => {
    return {
      id: card.id,
      name: card.name,
      gameName: card.game_name || 'Unknown Game',
      setName: card.set_name,
      cardNumber: card.card_number || '',
      rarity: card.rarity,
      imageUrl: card.image_url
    };
  };

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
      return `${label} (${variation.in_stock})`;
    }

    return label;
  };

  // --------------------------------------------------------------------------
  // BADGE GENERATION HELPERS
  // --------------------------------------------------------------------------

  const determineVariantType = (variation: BrowseVariation, allVariations: BrowseVariation[]): 'neutral' | 'accent' | 'warning' => {
    // Warning for out of stock in inventory mode
    if (mode === 'inventory' && variation.in_stock === 0) {
      return 'warning';
    }

    // Accent for premium treatments (foil, special borders, etc.)
    const treatment = variation.treatment?.toLowerCase() || '';
    const finish = variation.finish?.toLowerCase() || '';

    if (finish.includes('foil') || treatment.includes('borderless') || treatment.includes('extended') ||
        treatment.includes('showcase') || treatment.includes('textured')) {
      return 'accent';
    }

    return 'neutral';
  };

  const buildVariationTitle = (variation: BrowseVariation): string => {
    const parts = [];

    if (variation.sku) parts.push(`SKU: ${variation.sku}`);
    if (variation.price) parts.push(`Price: ${formatCurrencySimple(variation.price, currency)}`);
    if (variation.treatment) parts.push(`Treatment: ${formatTreatment(variation.treatment)}`);
    if (variation.finish) parts.push(`Finish: ${formatFinish(variation.finish)}`);
    if (variation.border_color) parts.push(`Border: ${variation.border_color}`);
    if (mode !== 'all') parts.push(`Stock: ${variation.in_stock}`);

    return parts.join(' • ');
  };

  const generateVariationBadges = (card: BrowseBaseCard): VariationBadge[] => {
    const visibleVariations = getVisibleVariations(card);

    if (visibleVariations.length === 0) {
      return [];
    }

    return visibleVariations.map(variation => {
      const treatmentLabel = formatTreatment(variation.treatment);
      const finishLabel = formatFinish(variation.finish);

      let label = `${treatmentLabel} ${finishLabel}`;
      if (mode !== 'all') {
        label += ` (${variation.in_stock} in stock)`;
      }

      const variant = determineVariantType(variation, visibleVariations);
      const title = buildVariationTitle(variation);

      return { label, variant, title };
    });
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

  const renderActionButton = (card: BrowseBaseCard) => {
    const visibleVariations = getVisibleVariations(card);
    const hasStock = visibleVariations.length > 0;
    const hasMultipleVariations = visibleVariations.length > 1;
    const isDisabled = mode === 'storefront' && !hasStock;

    const handleButtonClick = () => {
      if (visibleVariations.length === 1) {
        onAction(card, visibleVariations[0]); // Pass variation for single variation
      } else {
        onAction(card, undefined); // Let parent handle selection for multiple variations
      }
    };

    return (
      <div className="flex items-center gap-3">
        {/* Variation count indicator for multi-variation cards */}
        {hasMultipleVariations && (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-slate-100 text-slate-600 border border-slate-200">
            {visibleVariations.length} variations
          </span>
        )}

        {/* Price info */}
        {mode !== 'all' && card.lowest_price && (
          <span className="text-sm text-slate-600">
            From {formatCurrencySimple(card.lowest_price, currency)}
          </span>
        )}

        {/* Action button */}
        <button
          onClick={handleButtonClick}
          disabled={isDisabled}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-1 ${
            isDisabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          }`}
          aria-label={`${getActionButtonText()} for ${card.name}`}
        >
          {getActionButtonText()}
          {hasMultipleVariations && <span className="ml-1">▼</span>}
        </button>
      </div>
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
              const identity = convertToCardIdentity(card);
              const badges = generateVariationBadges(card);
              const rightNode = renderActionButton(card);

              return (
                <CardRow
                  key={card.id}
                  identity={identity}
                  badges={badges}
                  rightNode={rightNode}
                  onImageOpen={() => {
                    // TODO: Implement image modal functionality
                    console.log('Open image modal for:', card.name);
                  }}
                  className="hover:bg-slate-50 transition-colors"
                  tableMode={true}
                />
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