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
    foil_type: variation.finish === 'foil' ? 'Foil' : 'Regular', // Map finish to foil_type
    language: 'English', // Default language for admin display
    price: variation.price || 0,
    stock: variation.in_stock || 0, // Map in_stock to stock
    variation_key: `Near Mint-${variation.finish === 'foil' ? 'Foil' : 'Regular'}-English`,

    // Include backward compatibility fields
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
  return {
    // Core identification - direct mapping
    id: browseCard.id,
    name: browseCard.name,
    sku: browseCard.sku || `browse-${browseCard.id}`,
    card_number: browseCard.card_number || '',
    set_name: browseCard.set_name || '',
    game_name: browseCard.game_name || '',
    game_id: browseCard.game_id,
    set_id: browseCard.set_id,
    rarity: browseCard.rarity,
    image_url: browseCard.image_url,

    // Variation metadata - take from first variation if available
    treatment: browseCard.variations[0]?.treatment || browseCard.treatment,
    border_color: browseCard.variations[0]?.border_color || browseCard.border_color,
    finish: browseCard.variations[0]?.finish || browseCard.finish,
    frame_effect: browseCard.variations[0]?.frame_effect || browseCard.frame_effect,
    promo_type: browseCard.variations[0]?.promo_type || browseCard.promo_type,

    // Inventory aggregates - direct mapping
    total_stock: browseCard.total_stock,
    variation_count: browseCard.variation_count,
    has_inventory: browseCard.total_stock > 0,

    // Transform variations array
    variations: browseCard.variations.map(browseVariationToCardVariation),
  };
}