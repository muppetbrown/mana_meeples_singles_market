import React, { useMemo } from 'react';
import type { ViewMode } from './useShopViewMode';
import {
  CardList,
  CardGrid,
  ErrorBoundary
} from '@/shared/layout';
import { CardItem } from '@/shared/card';
import {
  SectionHeader
} from '@/shared/ui';
import { VIRTUAL_SCROLL_CONFIG } from '@/lib/constants';
import type { StorefrontCard, CardVariation, Currency, BrowseBaseCard } from '@/types';


interface SelectedVariations {
  [cardId: number]: string;
}

interface CardDisplayAreaProps {
  cards: StorefrontCard[];
  viewMode: ViewMode;
  currency: Currency;
  selectedVariations: SelectedVariations;
  filters: {
    sortBy: string;
  };
  onVariationChange: (cardId: number) => (e: React.ChangeEvent<HTMLSelectElement>) => void;
  setAddToCartModal: (state: { open: boolean; cardId: number }) => void;
  loading: boolean;
}

export const CardDisplayArea: React.FC<CardDisplayAreaProps> = ({
  cards,
  viewMode,
  currency,
  selectedVariations,
  filters,
  onVariationChange,
  setAddToCartModal,
  loading
}) => {
  // Convert StorefrontCard to BrowseBaseCard
  const convertStorefrontToBrowseCard = (card: StorefrontCard): BrowseBaseCard => {
    const variations = card.variations.map(variation => ({
      id: variation.card_id || card.id,
      sku: `${card.id}-${variation.quality}-${variation.finish || 'nonfoil'}-${variation.language}`,
      treatment: variation.treatment || 'STANDARD',
      finish: variation.finish || 'nonfoil',
      border_color: null,
      frame_effect: null,
      promo_type: null,
      image: card.image_url || null,
      in_stock: variation.stock || 0,
      price: variation.price || null
    }));

    const totalStock = variations.reduce((sum, v) => sum + v.in_stock, 0);
    const lowestPrice = variations.reduce((lowest, v) => {
      if (v.price === null) return lowest;
      return lowest === null ? v.price : Math.min(lowest, v.price);
    }, null as number | null);

    return {
      ...card,
      variations,
      variation_count: variations.length,
      total_stock: totalStock,
      lowest_price: lowestPrice
    };
  };

  const browseCards = useMemo(() => {
    return cards.map(convertStorefrontToBrowseCard);
  }, [cards]);

  // Card grouping and sorting logic extracted from ShopPage
  const groupedCards = useMemo(() => {
    if (!browseCards.length) return [];

    const { sortBy } = filters;

    // If no grouping needed, return ungrouped
    if (!['name', 'set', 'rarity', 'price', 'price_low', 'price_high'].includes(sortBy)) {
      return [{ section: null, cards: browseCards }];
    }

    const groups = new Map<string, BrowseBaseCard[]>();

    browseCards.forEach(card => {
      let sectionKey: string;
      let sectionTitle: string;

      if (sortBy === 'name') {
        const firstLetter = card.name.charAt(0).toUpperCase();
        sectionKey = firstLetter;
        sectionTitle = firstLetter;
      } else if (sortBy === 'set') {
        sectionKey = card.set_name;
        sectionTitle = card.set_name;
      } else if (sortBy === 'rarity') {
        const rarity = card.rarity || 'Unknown';
        sectionKey = rarity;
        sectionTitle = rarity;
      } else if (['price', 'price_low', 'price_high'].includes(sortBy)) {
        const price = card.lowest_price ?? 0;

        if (price < 1) {
          sectionKey = 'Under $1';
          sectionTitle = 'Under $1';
        } else if (price < 5) {
          sectionKey = '$1 - $4.99';
          sectionTitle = '$1 - $4.99';
        } else if (price < 10) {
          sectionKey = '$5 - $9.99';
          sectionTitle = '$5 - $9.99';
        } else if (price < 25) {
          sectionKey = '$10 - $24.99';
          sectionTitle = '$10 - $24.99';
        } else if (price < 50) {
          sectionKey = '$25 - $49.99';
          sectionTitle = '$25 - $49.99';
        } else if (price < 100) {
          sectionKey = '$50 - $99.99';
          sectionTitle = '$50 - $99.99';
        } else {
          sectionKey = '$100+';
          sectionTitle = '$100+';
        }
      } else {
        sectionKey = 'Other';
        sectionTitle = 'Other';
      }

      if (!groups.has(sectionKey)) {
        groups.set(sectionKey, []);
      }
      groups.get(sectionKey)!.push(card);
    });

    // Convert to array and sort groups
    const sortedGroups = Array.from(groups.entries()).map(([section, cards]) => ({
      section,
      cards
    }));

    // Sort the groups themselves
    sortedGroups.sort((a, b) => {
      if (sortBy === 'name' || sortBy === 'set' || sortBy === 'rarity') {
        return a.section.localeCompare(b.section);
      }

      if (['price', 'price_low', 'price_high'].includes(sortBy)) {
        const priceOrder: Record<string, number> = {
          'Under $1': 1,
          '$1 - $4.99': 2,
          '$5 - $9.99': 3,
          '$10 - $24.99': 4,
          '$25 - $49.99': 5,
          '$50 - $99.99': 6,
          '$100+': 7
        };

        const aOrder = priceOrder[a.section] || 8;
        const bOrder = priceOrder[b.section] || 8;

        // Reverse order for price_high
        if (sortBy === 'price_high') {
          return bOrder - aOrder;
        }
        return aOrder - bOrder;
      }

      return 0;
    });

    // Apply secondary alphabetical sorting within each group
    sortedGroups.forEach(group => {
      group.cards.sort((a, b) => a.name.localeCompare(b.name));
    });

    return sortedGroups;
  }, [browseCards, filters]);

  if (cards.length === 0 && !loading) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm">
        <p className="text-mm-forest text-lg">No cards found matching your search</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${viewMode === 'list' ? 'max-w-6xl mx-auto' : ''}`}>
      {viewMode === 'grid' ? (
        /* Grid View */
        browseCards.length > VIRTUAL_SCROLL_CONFIG.INITIAL_BATCH_SIZE ? (
          <ErrorBoundary>
            <CardGrid
              cards={browseCards}
              mode="storefront"
              currency={currency}
              onAddToCart={({ card, inventoryId, quantity }) => {
                setAddToCartModal({ open: true, cardId: card.id });
              }}
            />
          </ErrorBoundary>
        ) : (
          <div>
            {groupedCards.map((group, groupIndex) => (
              <div key={groupIndex} className="mb-8">
                {group.section && (
                  <SectionHeader title={group.section} count={group.cards.length} isGrid={true} />
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                  {group.cards.map((card) => {
                    // Find original StorefrontCard for CardItem
                    const originalCard = cards.find(c => c.id === card.id);
                    if (!originalCard) return null;

                    const selectedVariationKey = selectedVariations[card.id] || originalCard.variations[0]?.variation_key;
                    const selectedVariation = originalCard.variations.find(v => v.variation_key === selectedVariationKey) || originalCard.variations[0];

                    return (
                      <CardItem
                        key={card.id}
                        card={card}
                        mode="storefront"
                        currency={currency}
                        onAction={(params) => {
                          setAddToCartModal({ open: true, cardId: card.id });
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* List View */
        <div>
          {groupedCards.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-8">
              {group.section && (
                <SectionHeader title={group.section} count={group.cards.length} isGrid={false} />
              )}
              <CardList
                cards={group.cards}
                mode="storefront"
                currency={currency}
                onAction={(card, variation) => {
                  setAddToCartModal({ open: true, cardId: card.id });
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CardDisplayArea;