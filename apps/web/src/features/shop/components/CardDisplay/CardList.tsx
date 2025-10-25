// apps/web/src/features/shop/components/CardDisplay/CardList.tsx
/**
 * CardList Component - Row Format Display with Expandable Variations
 *
 * Features:
 * - Small card image on left, information on right
 * - Expandable variations below each card
 * - Admin mode: Shows card variations (not qualities - added on inventory)
 * - Shop mode: Shows variations + qualities with stock, hides no-stock cards
 */
import React, { useState } from 'react';
import OptimizedImage from '@/shared/components/media/OptimizedImage';
import VariationBadge from '@/shared/components/ui/VariationBadge';
import {
  Card,
  CardVariation,
  formatTreatment,
  formatFinish,
  isFoilCard,
  hasSpecialTreatment
} from '@/types';
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

type Currency = {
  symbol: string;
  rate: number;
};

export type CardListProps = {
  cards: Card[];
  currency: Currency;
  isAdminMode?: boolean;
  onAddToCart?: (card: Card, variation?: CardVariation) => void;
  onAddToInventory?: (card: Card) => void;
  className?: string;
};

type ExpandedState = {
  [cardId: number]: boolean;
};

// ============================================================================
// COMPONENT
// ============================================================================

const CardList = React.memo<CardListProps>(({
  cards,
  currency,
  isAdminMode = false,
  onAddToCart,
  onAddToInventory,
  className = ""
}) => {
  const [expandedCards, setExpandedCards] = useState<ExpandedState>({});

  // Group cards by card_number to create base cards with expandable variations
  const baseCards = React.useMemo(() => {
    const groups = new Map<string, Card[]>();

    // Group by set_name-card_number
    cards.forEach(card => {
      const key = `${card.set_name}-${card.card_number}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(card);
    });

    // Create base cards from groups
    return Array.from(groups.values()).map(cardGroup => {
      if (cardGroup.length === 1) {
        return cardGroup[0];
      }

      // Create base card with merged variations
      const baseCard = cardGroup[0];
      const allVariations = cardGroup.flatMap(c => c.variations || []);

      return {
        ...baseCard,
        variations: allVariations,
        variation_count: allVariations.length,
        total_stock: allVariations.reduce((sum, v) => sum + (v.stock || 0), 0),
      };
    });
  }, [cards]);

  // Filter based on mode
  const displayCards = React.useMemo(() => {
    if (isAdminMode) {
      // Admin mode: Show all base cards
      return baseCards;
    } else {
      // Shop mode: Only show base cards with stock
      return baseCards.filter(card => {
        if (!card.variations || card.variations.length === 0) return false;
        return card.variations.some(variation => (variation.stock || 0) > 0);
      });
    }
  }, [baseCards, isAdminMode]);

  const toggleExpanded = (cardId: number) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const handleAddToCart = (card: Card, variation: CardVariation) => {
    if (onAddToCart && !isAdminMode) {
      onAddToCart(card, variation);
    }
  };

  const handleAddToInventory = (card: Card) => {
    if (onAddToInventory && isAdminMode) {
      onAddToInventory(card);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return 'N/A';
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
    <div className={`space-y-2 ${className}`}>
      {displayCards.map((card) => {
        const isExpanded = expandedCards[card.id] || false;
        const hasVariations = card.variations && card.variations.length > 0;
        const isCardFoil = isFoilCard(card);
        const hasSpecial = hasSpecialTreatment(card);
        const imageUrl = card.image_url || '/images/card-back-placeholder.jpg';

        // For shop mode, get variations with stock
        const availableVariations = isAdminMode
          ? (card.variations || [])
          : (card.variations || []).filter(v => (v.stock || 0) > 0);

        return (
          <div key={card.id} className="card-mm bg-white border border-mm-warmAccent hover:border-mm-teal transition-colors">
            {/* Main card row */}
            <div className="flex items-center p-4 gap-4">
              {/* Card image */}
              <div className="relative flex-shrink-0 w-16 h-20 sm:w-20 sm:h-28">
                <OptimizedImage
                  src={imageUrl}
                  alt={card.name}
                  width={80}
                  height={112}
                  className="w-full h-full object-cover rounded-mm-sm bg-gradient-to-br from-mm-warmAccent to-mm-tealLight"
                  placeholder="blur"
                  sizes="80px"
                />
              </div>

              {/* Card information */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base sm:text-lg text-mm-darkForest truncate mb-1">
                  {card.name}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm text-mm-teal truncate">
                    {card.set_name} " #{card.card_number}
                    {card.rarity && ` " ${card.rarity}`}
                  </p>
                  {/* Variation badges in info section */}
                  {(isCardFoil || hasSpecial || card.promo_type) && (
                    <div className="flex gap-1">
                      {isCardFoil && (
                        <VariationBadge
                          finish={formatFinish(card.finish)}
                        />
                      )}
                      {hasSpecial && (
                        <VariationBadge
                          finish=""
                          treatment={formatTreatment(card.treatment)}
                        />
                      )}
                      {card.promo_type && (
                        <VariationBadge
                          finish=""
                          promoType={card.promo_type}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Summary stats */}
                <div className="flex items-center gap-4 text-xs sm:text-sm text-mm-darkForest">
                  {!isAdminMode && (
                    <>
                      <span className="font-medium">
                        {card.total_stock || 0} in stock
                      </span>
                      <span>
                        {card.variation_count || 0} variation{(card.variation_count || 0) !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                  {isAdminMode && (
                    <span className="font-medium">
                      {hasVariations ? `${availableVariations.length} variation${availableVariations.length !== 1 ? 's' : ''}` : 'Base card'}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions and expand button */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Admin add to inventory button */}
                {isAdminMode && (
                  <button
                    onClick={() => handleAddToInventory(card)}
                    className="btn-secondary p-2 sm:px-3 sm:py-2 text-xs sm:text-sm"
                    title="Add to inventory"
                  >
                    <PlusIcon className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Add to Inventory</span>
                  </button>
                )}

                {/* Expand/collapse button */}
                {availableVariations.length > 0 && (
                  <button
                    onClick={() => toggleExpanded(card.id)}
                    className="p-2 text-mm-teal hover:text-mm-darkForest transition-colors"
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} variations for ${card.name}`}
                  >
                    {isExpanded ? (
                      <ChevronDownIcon className="w-5 h-5" />
                    ) : (
                      <ChevronRightIcon className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Expandable variations section */}
            {isExpanded && availableVariations.length > 0 && (
              <div className="border-t border-mm-warmAccent bg-gray-50">
                <div className="p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-mm-darkForest mb-3">
                    {isAdminMode ? 'Card Variations:' : 'Available Options:'}
                  </h4>

                  <div className="space-y-2">
                    {availableVariations.map((variation) => (
                      <div
                        key={`${card.id}-${variation.variation_key || variation.inventory_id}`}
                        className="flex items-center justify-between p-3 bg-white rounded-mm-sm border border-mm-warmAccent hover:border-mm-teal transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-mm-darkForest">
                              {variation.quality}
                            </span>
                            {variation.foil_type !== 'Regular' && (
                              <VariationBadge
                                finish={formatFinish(variation.foil_type)}
                              />
                            )}
                            {variation.language && variation.language !== 'English' && (
                              <span className="text-xs bg-mm-warmAccent text-mm-darkForest px-2 py-0.5 rounded-full">
                                {variation.language}
                              </span>
                            )}
                          </div>

                          {!isAdminMode && (
                            <div className="flex items-center gap-4 text-xs text-mm-teal">
                              <span>Stock: {variation.stock || 0}</span>
                              {variation.price && (
                                <span className="font-semibold text-mm-darkForest">
                                  {currency.symbol}{formatPrice(variation.price)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Add to cart button for shop mode */}
                        {!isAdminMode && variation.stock && variation.stock > 0 && (
                          <button
                            onClick={() => handleAddToCart(card, variation)}
                            className="btn-primary px-3 py-1.5 text-xs"
                            title="Add to cart"
                          >
                            <ShoppingCartIcon className="w-4 h-4 mr-1" />
                            Add to Cart
                          </button>
                        )}

                        {/* Admin mode inventory info */}
                        {isAdminMode && (
                          <div className="text-right">
                            <div className="text-xs text-mm-teal">
                              ID: {variation.inventory_id}
                            </div>
                            {variation.price && (
                              <div className="text-sm font-semibold text-mm-darkForest">
                                {currency.symbol}{formatPrice(variation.price)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* No variations message for admin */}
                  {isAdminMode && availableVariations.length === 0 && (
                    <p className="text-sm text-mm-teal italic">
                      No inventory variations created yet. Add to inventory to create variations with specific qualities and foil types.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

CardList.displayName = 'CardList';

export default CardList;