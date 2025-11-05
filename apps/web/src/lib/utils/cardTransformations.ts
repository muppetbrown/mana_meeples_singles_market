/**
 * Card Transformation Utilities
 *
 * Centralized, type-safe utilities for transforming between different card data formats.
 * This module ensures consistent transformations across the application and eliminates
 * duplicate transformation logic.
 *
 * @module cardTransformations
 */

import type {
  Card,
  StorefrontCard,
  BrowseBaseCard,
  BrowseVariation
} from '@/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for transforming a card to include price calculation
 */
export interface CardTransformOptions {
  /** Whether to calculate and include the price field based on finish type */
  calculatePrice?: boolean;
  /** Default values to use for missing fields */
  defaults?: {
    treatment?: string;
    finish?: string;
    sku?: string;
  };
}

// ============================================================================
// PRICE CALCULATION
// ============================================================================

/**
 * Calculate the appropriate price for a card based on its finish type.
 *
 * Pricing Rules:
 * - Nonfoil cards (finish includes 'non' or is empty): use base_price
 * - Foil/Etched cards: use foil_price
 * - Unknown finishes: default to base_price
 *
 * @param card - Card with pricing information
 * @returns The calculated price, or null if no price is available
 *
 * @example
 * ```ts
 * const price = calculateCardPrice({ finish: 'foil', foil_price: 5.99 });
 * // Returns: 5.99
 * ```
 */
export function calculateCardPrice(
  card: Pick<Card, 'finish' | 'base_price' | 'foil_price'>
): number | null {
  const finish = (card.finish ?? '').toLowerCase();

  // Check for nonfoil first (before checking for 'foil' substring)
  if (finish.includes('non') || finish === 'nonfoil' || finish === '') {
    return card.base_price ?? null;
  }

  // For foil/etched finishes, use foil_price
  if (finish.includes('foil') || finish.includes('etched')) {
    return card.foil_price ?? null;
  }

  // Default to base_price for unknown finishes
  return card.base_price ?? null;
}

/**
 * Calculate the appropriate price for a variation.
 * Alias for calculateCardPrice with BrowseVariation type.
 */
export function calculateVariationPrice(
  variation: Pick<BrowseVariation, 'finish' | 'base_price' | 'foil_price'>
): number | null {
  return calculateCardPrice(variation);
}

// ============================================================================
// CARD TRANSFORMATIONS
// ============================================================================

/**
 * Transform a StorefrontCard to a Card suitable for grouping into BrowseBaseCard.
 *
 * StorefrontCards have treatment/finish metadata and a variations array with
 * quality/language inventory options. This function prepares them for the
 * groupCardsForBrowse utility.
 *
 * @param storefrontCard - Card from storefront API
 * @param options - Transformation options
 * @returns Card ready for grouping
 *
 * @example
 * ```ts
 * const cards = storefrontCards.map(card =>
 *   transformStorefrontCard(card, { calculatePrice: true })
 * );
 * const grouped = groupCardsForBrowse(cards);
 * ```
 */
export function transformStorefrontCard(
  storefrontCard: StorefrontCard,
  options: CardTransformOptions = {}
): Card {
  const { calculatePrice = true, defaults = {} } = options;

  const card: Card = {
    ...storefrontCard,
    // Ensure required fields have values
    id: storefrontCard.id,
    sku: storefrontCard.sku || defaults.sku || String(storefrontCard.id),
    name: storefrontCard.name,
    card_number: storefrontCard.card_number,
    set_id: storefrontCard.set_id || 0,
    set_name: storefrontCard.set_name,
    game_name: storefrontCard.game_name,
    image_url: storefrontCard.image_url || '',

    // Use actual metadata or defaults
    treatment: storefrontCard.treatment || defaults.treatment || 'STANDARD',
    finish: storefrontCard.finish || defaults.finish || 'nonfoil',

    // Ensure numeric fields have fallback values
    rarity: storefrontCard.rarity ?? 'Unknown',
    total_stock: storefrontCard.total_stock ?? 0,
    variation_count: storefrontCard.variation_count ?? 0,

    // Preserve pricing fields (explicitly handle undefined for exactOptionalPropertyTypes)
    base_price: storefrontCard.base_price ?? null,
    foil_price: storefrontCard.foil_price ?? null,
    price_source: storefrontCard.price_source ?? null,
  };

  return card;
}

/**
 * Batch transform multiple StorefrontCards.
 *
 * @param cards - Array of storefront cards
 * @param options - Transformation options
 * @returns Array of transformed cards
 */
export function transformStorefrontCards(
  cards: StorefrontCard[],
  options: CardTransformOptions = {}
): Card[] {
  return cards.map(card => transformStorefrontCard(card, options));
}

// ============================================================================
// VALIDATION & TYPE GUARDS
// ============================================================================

/**
 * Validate that a card has the minimum required fields for display.
 *
 * @param card - Card to validate
 * @returns true if card has all required fields
 */
export function isValidDisplayCard(card: Partial<Card>): card is Card {
  return !!(
    card.id &&
    card.name &&
    card.set_name &&
    card.game_name &&
    typeof card.card_number === 'string'
  );
}

/**
 * Check if a card has pricing information available.
 *
 * @param card - Card to check
 * @returns true if card has at least one price field
 */
export function hasPricingInfo(card: Pick<Card, 'base_price' | 'foil_price'>): boolean {
  return card.base_price != null || card.foil_price != null;
}

/**
 * Check if a card has any stock available.
 *
 * @param card - Card to check
 * @returns true if card has stock > 0
 */
export function hasStock(card: Pick<Card, 'total_stock'>): boolean {
  return (card.total_stock ?? 0) > 0;
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Filter cards to only those with valid display data.
 *
 * @param cards - Array of cards to filter
 * @returns Array of valid display cards
 */
export function filterValidCards(cards: Partial<Card>[]): Card[] {
  return cards.filter(isValidDisplayCard);
}

/**
 * Filter cards to only those with pricing information.
 *
 * @param cards - Array of cards to filter
 * @returns Array of cards with pricing
 */
export function filterCardsWithPricing<T extends Pick<Card, 'base_price' | 'foil_price'>>(
  cards: T[]
): T[] {
  return cards.filter(hasPricingInfo);
}

/**
 * Filter cards to only those with stock available.
 *
 * @param cards - Array of cards to filter
 * @returns Array of cards with stock
 */
export function filterCardsWithStock<T extends Pick<Card, 'total_stock'>>(
  cards: T[]
): T[] {
  return cards.filter(hasStock);
}

// ============================================================================
// STATISTICS & ANALYTICS
// ============================================================================

/**
 * Calculate total stock across multiple cards.
 *
 * @param cards - Array of cards
 * @returns Total stock count
 */
export function calculateTotalStock(cards: Pick<Card, 'total_stock'>[]): number {
  return cards.reduce((sum, card) => sum + (card.total_stock || 0), 0);
}

/**
 * Count unique cards by set_name and card_number combination.
 *
 * @param cards - Array of cards
 * @returns Number of unique cards
 */
export function countUniqueCards(
  cards: Pick<Card, 'set_name' | 'card_number'>[]
): number {
  const unique = new Set(
    cards.map(card => `${card.set_name}|${card.card_number}`)
  );
  return unique.size;
}

/**
 * Calculate average variations per unique card.
 *
 * @param cards - Array of cards
 * @returns Average variations per card, or 0 if no cards
 */
export function calculateAverageVariations(
  cards: Pick<Card, 'set_name' | 'card_number'>[]
): number {
  const uniqueCount = countUniqueCards(cards);
  if (uniqueCount === 0) return 0;

  return Math.round((cards.length / uniqueCount) * 10) / 10;
}
