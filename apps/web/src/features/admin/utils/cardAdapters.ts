// File: apps/web/src/features/admin/utils/cardAdapters.ts

import type { BrowseBaseCard, BrowseVariation, Card, CardVariation } from '@/types';

/**
 * Converts a BrowseVariation to CardVariation for display purposes
 *
 * BrowseVariation represents card rows with treatment/finish metadata
 * CardVariation represents inventory entries with quality/foil/language options
 */
function browseVariationToCardVariation(variation: BrowseVariation): CardVariation {
  return {
    inventory_id: variation.id, // Use card row ID as inventory_id
    quality: 'Near Mint', // Default quality for admin display
    language: 'English', // Default language for admin display
    price: variation.price || 0,
    stock: variation.in_stock || 0, // Map in_stock to stock
    variation_key: `Near Mint-${variation.finish || 'nonfoil'}-English`,
    finish: variation.finish,
    treatment: variation.treatment,
  };
}

/**
 * Converts a BrowseBaseCard to Card for display in CardItem components
 *
 * BrowseBaseCard is used in admin context with BrowseVariation[] (card rows)
 * Card is expected by CardItem component with CardVariation[] (inventory entries)
 */
export function browseCardToCard(browseCard: BrowseBaseCard): Card {
  const result: Card = {
    // Core identification - direct mapping
    id: browseCard.id,
    name: browseCard.name,
    sku: browseCard.sku || `browse-${browseCard.id}`,
    card_number: browseCard.card_number || '',
    set_name: browseCard.set_name || '',
    game_name: browseCard.game_name || '',

    // Inventory aggregates - direct mapping
    total_stock: browseCard.total_stock,
    variation_count: browseCard.variation_count,
    has_inventory: browseCard.total_stock > 0,

    // Transform variations array
    variations: browseCard.variations.map(browseVariationToCardVariation),
  };

  // Handle optional properties - only assign if not undefined
  if (browseCard.game_id !== undefined) {
    result.game_id = browseCard.game_id;
  }
  if (browseCard.set_id !== undefined) {
    result.set_id = browseCard.set_id;
  }
  if (browseCard.rarity !== undefined) {
    result.rarity = browseCard.rarity;
  }
  if (browseCard.image_url !== undefined) {
    result.image_url = browseCard.image_url;
  }

  // Handle optional variation metadata
  const firstVariation = browseCard.variations[0];
  const treatment = firstVariation?.treatment || browseCard.treatment;
  const border_color = firstVariation?.border_color || browseCard.border_color;
  const finish = firstVariation?.finish || browseCard.finish;
  const frame_effect = firstVariation?.frame_effect || browseCard.frame_effect;
  const promo_type = firstVariation?.promo_type || browseCard.promo_type;

  if (treatment !== undefined) {
    result.treatment = treatment;
  }
  if (border_color !== undefined) {
    result.border_color = border_color;
  }
  if (finish !== undefined) {
    result.finish = finish;
  }
  if (frame_effect !== undefined) {
    result.frame_effect = frame_effect;
  }
  if (promo_type !== undefined) {
    result.promo_type = promo_type;
  }

  return result;
}