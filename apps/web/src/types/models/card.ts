// apps/web/src/types/models/card.ts - REFACTORED FOR NEW ARCHITECTURE
/**
 * Card Type Definitions
 * 
 * NEW ARCHITECTURE:
 * - Variation metadata (treatment, finish, border_color, frame_effect, promo_type) 
 *   is stored directly on the cards table
 * - Each card row represents a unique variation
 * - For ADMIN: Cards don't have variations array (just metadata)
 * - For STOREFRONT: Cards DO have variations array (quality/foil/language options)
 */

// ============================================================================
// BASE CARD INTERFACE - Used across admin and storefront
// ============================================================================

export interface Card {
  // Core card identification
  id: number;
  sku: string;
  name: string;
  card_number: string;
  set_name: string;
  game_name: string;
  game_id?: number;
  set_id?: number;
  rarity?: string;
  image_url?: string;
  
  // NEW: Variation metadata directly on card (from cards table)
  treatment?: string;        // e.g., "STANDARD", "BORDERLESS", "EXTENDED_ART"
  border_color?: string;     // e.g., "black", "white", "silver", "gold"
  finish?: string;           // e.g., "nonfoil", "foil", "etched"
  frame_effect?: string;     // e.g., "legendary", "showcase", "extended"
  promo_type?: string;       // e.g., "prerelease", "stamped", "datestamped"
  
  // Inventory aggregates (from card_inventory LEFT JOIN)
  total_stock?: number;      // Total stock across all inventory entries
  variation_count?: number;  // Count of inventory entries (quality/foil/language combos)
  has_inventory?: boolean;   // Whether any inventory exists for this card
  
  // OPTIONAL: Only present in storefront context
  // (Admin views don't need this - they show raw card data)
  variations?: CardVariation[];
}

// ============================================================================
// CARD VARIATION - Represents an inventory entry (quality/foil/language combo)
// ============================================================================

export interface CardVariation {
  // Inventory identification
  inventory_id: number;      // ID from card_inventory table
  card_id?: number;          // FK to cards table (optional for some contexts)
  
  // Inventory-specific attributes (what makes each inventory entry unique)
  quality: string;           // e.g., "Near Mint", "Lightly Played", "Damaged"
  foil_type: string;         // e.g., "Regular", "Foil"
  language: string;          // e.g., "English", "Japanese", "Spanish"
  
  // Pricing and stock
  price: number | null;      // Current price (from card_pricing or card_inventory)
  stock: number | null;      // Stock quantity available
  
  // Convenience fields
  variation_key: string;     // e.g., "Near Mint-Regular-English"
  
  // DEPRECATED: These fields are now on Card interface
  // Kept for backward compatibility during transition
  finish?: string;           // Use Card.finish instead
  treatment?: string;        // Use Card.treatment instead
}

// ============================================================================
// STOREFRONT CARD - Explicitly has variations array
// ============================================================================

export interface StorefrontCard extends Card {
  variations: CardVariation[];  // Always present for storefront
}

// ============================================================================
// ADMIN CARD - Explicitly does NOT have variations array
// ============================================================================

export interface AdminCard extends Card {
  variations?: never;  // Type-level enforcement that variations don't exist
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a card is a StorefrontCard (has variations array)
 */
export function isStorefrontCard(card: Card): card is StorefrontCard {
  return Array.isArray(card.variations) && card.variations.length > 0;
}

/**
 * Check if a card is an AdminCard (no variations array)
 */
export function isAdminCard(card: Card): card is AdminCard {
  return !card.variations || card.variations.length === 0;
}



/**
 * Check if a card has variation metadata
 */
export function hasVariationMetadata(card: Card): boolean {
  return !!(
    card.treatment ||
    card.border_color ||
    card.finish ||
    card.frame_effect ||
    card.promo_type
  );
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Partial card for creation/updates
 */
export type PartialCard = Partial<Card> & {
  id?: number;
  name: string;
  card_number: string;
};

/**
 * Card with required fields for display
 */
export type DisplayCard = Required<Pick<Card, 'id' | 'name' | 'card_number' | 'set_name' | 'game_name'>> & 
  Partial<Omit<Card, 'id' | 'name' | 'card_number' | 'set_name' | 'game_name'>>;

/**
 * Card search result (minimal fields)
 */
export interface CardSearchResult {
  id: number;
  name: string;
  card_number: string;
  set_name: string;
  image_url?: string;
  treatment?: string;
  finish?: string;
}

export type BrowseVariation = {
  id: number;           // card row id
  sku: string;
  treatment: string;
  finish: string;
  border_color?: string | null;
  frame_effect?: string | null;
  promo_type?: string | null;
  image?: string | null;
  in_stock: number;     // aggregated across qualities/languages for this card row
  price?: number | null;
};

export type BrowseBaseCard = Omit<Card, 'variations'> & {
  variations: BrowseVariation[];
  variation_count: number;
  total_stock: number;
  lowest_price: number | null;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format treatment label for display
 * Example: "EXTENDED_ART" → "Extended Art"
 */
export function formatTreatment(treatment?: string | null): string {
  if (!treatment) return 'Standard';
  return treatment
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format finish label for display
 * Example: "nonfoil" → "Regular", "foil" → "Foil"
 */
export function formatFinish(finish?: string | null): string {
  if (!finish) return 'Regular';
  const lower = finish.toLowerCase();
  if (lower.includes('foil') && !lower.includes('non')) return 'Foil';
  if (lower.includes('etched')) return 'Etched';
  return 'Regular';
}

/**
 * Check if card is foil based on finish
 */
export function isFoilCard(card: Card): boolean {
  if (!card.finish) return false;
  const lower = card.finish.toLowerCase();
  return lower.includes('foil') && !lower.includes('non');
}

/**
 * Check if card has special treatment
 */
export function hasSpecialTreatment(card: Card): boolean {
  if (!card.treatment) return false;
  const upper = card.treatment.toUpperCase();
  return upper !== 'STANDARD' && upper !== '';
}

/**
 * Get display name for card with variation info
 * Example: "Lightning Bolt (Borderless, Foil)"
 */
export function getCardDisplayName(card: Card): string {
  const parts = [card.name];
  
  const modifiers: string[] = [];
  
  if (hasSpecialTreatment(card)) {
    modifiers.push(formatTreatment(card.treatment));
  }
  
  if (isFoilCard(card)) {
    modifiers.push('Foil');
  }
  
  if (card.promo_type) {
    modifiers.push('Promo');
  }
  
  if (modifiers.length > 0) {
    parts.push(`(${modifiers.join(', ')})`);
  }
  
  return parts.join(' ');
}

/**
 * Get unique treatments from card array
 */
export function getUniqueTreatments(cards: Card[]): string[] {
  const treatments = new Set<string>();
  cards.forEach(card => {
    if (card.treatment) {
      treatments.add(card.treatment);
    }
  });
  return Array.from(treatments).sort();
}

/**
 * Get unique finishes from card array
 */
export function getUniqueFinishes(cards: Card[]): string[] {
  const finishes = new Set<string>();
  cards.forEach(card => {
    if (card.finish) {
      finishes.add(card.finish);
    }
  });
  return Array.from(finishes).sort();
}

// ============================================================================
// EXPORT ALL
// ============================================================================

// Note: No default export with verbatimModuleSyntax
// Use named exports: import { Card } from './card';