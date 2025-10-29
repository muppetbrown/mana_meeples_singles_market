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
  // BADGE GENERATION
  // --------------------------------------------------------------------------

  const generateVariationBadges = (card: BrowseBaseCard): VariationBadge[] => {
    const visibleVariations = getVisibleVariations(card);

    if (visibleVariations.length === 0) {
      return [];
    }

    return visibleVariations.map(variation => {
      const baseLabel = formatVariationLabel(variation, mode !== 'all');
      let badge: VariationBadge = {
        label: baseLabel,
        variant: 'neutral',
        title: `${formatTreatment(variation.treatment)} ${formatFinish(variation.finish)} variation`
      };

      // Add price info if available and not in 'all' mode
      if (variation.price && mode !== 'all') {
        badge.label += ` • ${formatCurrencySimple(variation.price, currency)}`;
        badge.variant = 'accent';
        badge.title += ` - ${formatCurrencySimple(variation.price, currency)}`;
      }

      return badge;
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
    const isDisabled = mode !== 'all' && visibleVariations.length === 0;

    return (
      <div className="flex items-center gap-3">
        {/* Price info */}
        {mode !== 'all' && card.lowest_price && (
          <span className="text-sm text-slate-600">
            From {formatCurrencySimple(card.lowest_price, currency)}
          </span>
        )}

        {/* Action button */}
        <button
          onClick={() => onAction(card, visibleVariations[0])}
          disabled={isDisabled}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isDisabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          }`}
          aria-label={`${getActionButtonText()} for ${card.name}`}
        >
          {getActionButtonText()}
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
    <div className="space-y-2">
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
          />
        );
      })}
    </div>
  );
};

CardList.displayName = 'CardList';
export default CardList;