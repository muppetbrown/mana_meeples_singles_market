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
  analyzeVariations,
  formatVariationDifference,
  formatVariationFullTitle
} from '@/lib/utils/variationComparison';
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
  // IMAGE MODAL STATE
  // --------------------------------------------------------------------------
  const [expandedImage, setExpandedImage] = React.useState<{ url: string; name: string } | null>(null);

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
      ...(card.rarity && { rarity: card.rarity }),
      ...(card.image_url && { imageUrl: card.image_url })
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

  /**
   * Generate variation badges showing only different fields
   * FIXED: Now analyzes which fields differ and shows only those
   */
  const generateVariationBadges = (card: BrowseBaseCard): VariationBadge[] => {
    const visibleVariations = getVisibleVariations(card);

    if (visibleVariations.length === 0) {
      return [];
    }

    // Analyze which fields are common vs different
    const analysis = analyzeVariations(visibleVariations);

    return visibleVariations.map(variation => {
      // Use smart formatting that shows only different fields
      let label = formatVariationDifference(variation, analysis);

      // Add stock count based on mode
      if (mode !== 'all') {
        label += ` (${variation.in_stock} in stock)`;
      }

      // Determine variant based on commonality and stock
      const variant = determineVariantType(variation, visibleVariations);

      // Build hover title with FULL details (always show everything in hover)
      const title = formatVariationFullTitle(variation);

      return {
        label,
        variant,
        title
      };
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
      {/* Desktop/Tablet Table View - Hidden on mobile */}
      <div className="hidden sm:block w-full overflow-x-auto">
        <table className="w-full table-auto border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">
                Image
              </th>
              <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Game
              </th>
              <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Set
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Name
              </th>
              <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">
                #
              </th>
              <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">
                Rarity
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Variations
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">
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
                    setExpandedImage({
                      url: card.image_url || '/placeholder-card.png',
                      name: card.name
                    });
                  }}
                  className="hover:bg-slate-50 transition-colors"
                  tableMode={true}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View - Visible only on mobile */}
      <div className="sm:hidden divide-y divide-slate-200">
        {cards.map(card => {
          const identity = convertToCardIdentity(card);
          const badges = generateVariationBadges(card);
          const visibleVariations = getVisibleVariations(card);

          return (
            <div key={card.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex gap-3">
                {/* Card Image */}
                <button
                  type="button"
                  onClick={() => {
                    setExpandedImage({
                      url: card.image_url || '/placeholder-card.png',
                      name: card.name
                    });
                  }}
                  className="w-16 h-24 flex-shrink-0 overflow-hidden rounded-md bg-slate-100 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 hover:shadow-md cursor-pointer"
                  aria-haspopup="dialog"
                  aria-label={`Open larger image for ${card.name}`}
                >
                  <img
                    src={card.image_url || '/placeholder-card.png'}
                    alt=""
                    className="object-cover w-full h-full"
                    loading="lazy"
                  />
                </button>

                {/* Card Details */}
                <div className="flex-1 min-w-0">
                  {/* Card Name */}
                  <h3 className="text-base font-semibold text-slate-900 mb-1 line-clamp-2">
                    {card.name}
                  </h3>

                  {/* Meta Info */}
                  <div className="space-y-1 text-xs text-slate-600 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">Game:</span>
                      <span className="truncate">{identity.gameName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">Set:</span>
                      <span className="truncate">{identity.setName}</span>
                    </div>
                    {identity.cardNumber && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">#:</span>
                        <span>{identity.cardNumber}</span>
                      </div>
                    )}
                    {identity.rarity && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">Rarity:</span>
                        <span>{identity.rarity}</span>
                      </div>
                    )}
                  </div>

                  {/* Variations */}
                  {badges && badges.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-slate-600 mb-1.5">Variations:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {badges.map((badge, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs border font-medium ${
                              badge.variant === 'accent' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              badge.variant === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                            title={badge.title || `Variation: ${badge.label}`}
                          >
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="flex items-center justify-between gap-2">
                    {mode !== 'all' && card.lowest_price && (
                      <span className="text-sm font-medium text-slate-700">
                        From {formatCurrencySimple(card.lowest_price, currency)}
                      </span>
                    )}
                    <button
                      onClick={() => {
                        if (visibleVariations.length === 1) {
                          onAction(card, visibleVariations[0]);
                        } else {
                          onAction(card, undefined);
                        }
                      }}
                      disabled={mode === 'storefront' && visibleVariations.length === 0}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-1 ${
                        mode === 'storefront' && visibleVariations.length === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                      }`}
                      aria-label={`${getActionButtonText()} for ${card.name}`}
                    >
                      {getActionButtonText()}
                      {visibleVariations.length > 1 && <span className="ml-1">▼</span>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setExpandedImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Full size image of ${expandedImage.name}`}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col">
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 text-2xl font-bold px-4 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
              aria-label="Close image"
            >
              ✕
            </button>
            <img
              src={expandedImage.url}
              alt={expandedImage.name}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-white text-center mt-4 text-lg font-medium">
              {expandedImage.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

CardList.displayName = 'CardList';
export default CardList;