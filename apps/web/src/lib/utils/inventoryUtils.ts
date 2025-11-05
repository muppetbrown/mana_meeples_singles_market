/**
 * Inventory Utilities
 *
 * Shared utilities for inventory operations across shop and admin interfaces.
 * Provides consistent data transformation, validation, and formatting.
 *
 * @module inventoryUtils
 *
 * ## Key Functions
 * - Price conversion and formatting (dollars ↔ cents)
 * - Inventory option validation and selection
 * - Quality/Language combination utilities
 * - Stock availability checks
 *
 * ## Usage
 * ```ts
 * import { formatPriceForStorage, createInventoryKey } from '@/lib/utils/inventoryUtils';
 *
 * const price = formatPriceForStorage('10.50'); // 10.50 (number)
 * const key = createInventoryKey('Near Mint', 'English'); // "Near Mint-English"
 * ```
 */

import type { Quality, Language } from '@/types/enums/inventory';
import { isValidQuality, isValidLanguage } from '@/types/enums/inventory';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Unified inventory option structure used across shop and admin
 */
export interface InventoryOption {
  /** Unique inventory entry ID */
  inventoryId: number;
  /** Card quality grade */
  quality: Quality;
  /** Card language */
  language: Language;
  /** Price in dollars (not cents) */
  price: number;
  /** Available stock quantity */
  inStock: number;
  /** Optional: Card finish (foil/nonfoil/etched) */
  finish?: string;
}

/**
 * Result of inventory validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Error messages if validation failed */
  errors: string[];
}

// ============================================================================
// PRICE UTILITIES
// ============================================================================

/**
 * Convert price to standardized storage format (dollars as decimal number).
 *
 * Handles various input formats:
 * - String numbers: "10.50" → 10.50
 * - Numbers: 10.5 → 10.50
 * - Cents (if specified): 1050 → 10.50
 *
 * @param price - Price in any format
 * @param fromCents - If true, treats input as cents and converts to dollars
 * @returns Price in dollars, rounded to 2 decimal places
 *
 * @example
 * ```ts
 * formatPriceForStorage('10.50');     // 10.50
 * formatPriceForStorage(10.5);        // 10.50
 * formatPriceForStorage(1050, true);  // 10.50 (from cents)
 * ```
 */
export function formatPriceForStorage(
  price: string | number,
  fromCents: boolean = false
): number {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(numPrice)) {
    console.warn(`Invalid price value: ${price}`);
    return 0;
  }

  const dollars = fromCents ? numPrice / 100 : numPrice;
  return Number(dollars.toFixed(2));
}

/**
 * Convert price from dollars to cents for legacy systems.
 *
 * @param priceInDollars - Price in dollars
 * @returns Price in cents (rounded to nearest cent)
 */
export function convertDollarsToCents(priceInDollars: number): number {
  return Math.round(priceInDollars * 100);
}

/**
 * Convert price from cents to dollars.
 *
 * @param priceInCents - Price in cents
 * @returns Price in dollars (2 decimal places)
 */
export function convertCentsToDollars(priceInCents: number): number {
  return Number((priceInCents / 100).toFixed(2));
}

/**
 * Validate that a price is reasonable for a trading card.
 *
 * @param price - Price to validate (in dollars)
 * @returns True if price is within reasonable bounds
 */
export function isValidPrice(price: number): boolean {
  return price >= 0 && price <= 10000 && !isNaN(price);
}

// ============================================================================
// INVENTORY KEY UTILITIES
// ============================================================================

/**
 * Create a consistent inventory key from quality and language.
 *
 * Format: "{quality}-{language}"
 * Example: "Near Mint-English"
 *
 * This key is used to uniquely identify inventory options and for
 * lookups in the cart system.
 *
 * @param quality - Card quality
 * @param language - Card language
 * @returns Formatted inventory key
 */
export function createInventoryKey(quality: string, language: string): string {
  return `${quality}-${language}`;
}

/**
 * Parse an inventory key back into quality and language components.
 *
 * @param key - Inventory key in format "quality-language"
 * @returns Object with quality and language, or null if invalid
 */
export function parseInventoryKey(
  key: string
): { quality: string; language: string } | null {
  const parts = key.split('-');
  if (parts.length !== 2) {
    return null;
  }

  return {
    quality: parts[0],
    language: parts[1]
  };
}

// ============================================================================
// INVENTORY VALIDATION
// ============================================================================

/**
 * Validate an inventory option has all required fields.
 *
 * @param option - Inventory option to validate
 * @returns Validation result with errors if any
 */
export function validateInventoryOption(
  option: Partial<InventoryOption>
): ValidationResult {
  const errors: string[] = [];

  if (!option.inventoryId || option.inventoryId <= 0) {
    errors.push('Invalid inventory ID');
  }

  if (!option.quality || !isValidQuality(option.quality)) {
    errors.push(`Invalid quality: ${option.quality}`);
  }

  if (!option.language || !isValidLanguage(option.language)) {
    errors.push(`Invalid language: ${option.language}`);
  }

  if (option.price !== undefined && !isValidPrice(option.price)) {
    errors.push(`Invalid price: ${option.price}`);
  }

  if (option.inStock !== undefined && (option.inStock < 0 || !Number.isInteger(option.inStock))) {
    errors.push(`Invalid stock quantity: ${option.inStock}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if an inventory option has sufficient stock for requested quantity.
 *
 * @param option - Inventory option to check
 * @param requestedQuantity - Quantity requested
 * @returns True if sufficient stock is available
 */
export function hasStockAvailable(
  option: Pick<InventoryOption, 'inStock'>,
  requestedQuantity: number
): boolean {
  return option.inStock >= requestedQuantity && requestedQuantity > 0;
}

/**
 * Check if an inventory option is currently available (has any stock).
 *
 * @param option - Inventory option to check
 * @returns True if option has stock available
 */
export function isAvailable(option: Pick<InventoryOption, 'inStock'>): boolean {
  return option.inStock > 0;
}

// ============================================================================
// INVENTORY SELECTION UTILITIES
// ============================================================================

/**
 * Find the cheapest available inventory option from a list.
 *
 * Only considers options with stock > 0.
 *
 * @param options - Array of inventory options
 * @returns Cheapest option or null if none available
 */
export function findCheapestOption(
  options: InventoryOption[]
): InventoryOption | null {
  const availableOptions = options.filter(opt => opt.inStock > 0);

  if (availableOptions.length === 0) {
    return null;
  }

  return availableOptions.reduce((cheapest, current) =>
    current.price < cheapest.price ? current : cheapest
  );
}

/**
 * Find inventory option by quality and language.
 *
 * @param options - Array of inventory options
 * @param quality - Desired quality
 * @param language - Desired language
 * @returns Matching option or null if not found
 */
export function findOptionByQualityLanguage(
  options: InventoryOption[],
  quality: string,
  language: string
): InventoryOption | null {
  return options.find(
    opt => opt.quality === quality && opt.language === language
  ) || null;
}

/**
 * Get unique qualities from inventory options (with stock if specified).
 *
 * @param options - Array of inventory options
 * @param onlyWithStock - If true, only returns qualities that have stock
 * @returns Array of unique quality values
 */
export function getAvailableQualities(
  options: InventoryOption[],
  onlyWithStock: boolean = true
): Quality[] {
  const filteredOptions = onlyWithStock
    ? options.filter(opt => opt.inStock > 0)
    : options;

  const uniqueQualities = new Set(filteredOptions.map(opt => opt.quality));
  return Array.from(uniqueQualities);
}

/**
 * Get available languages for a specific quality.
 *
 * @param options - Array of inventory options
 * @param quality - Quality to filter by
 * @param onlyWithStock - If true, only returns languages that have stock
 * @returns Array of available languages for the quality
 */
export function getAvailableLanguagesForQuality(
  options: InventoryOption[],
  quality: string,
  onlyWithStock: boolean = true
): Language[] {
  const qualityOptions = options.filter(opt => opt.quality === quality);
  const filteredOptions = onlyWithStock
    ? qualityOptions.filter(opt => opt.inStock > 0)
    : qualityOptions;

  const uniqueLanguages = new Set(filteredOptions.map(opt => opt.language));
  return Array.from(uniqueLanguages);
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Calculate total stock across all inventory options.
 *
 * @param options - Array of inventory options
 * @returns Total stock quantity
 */
export function calculateTotalInventoryStock(options: InventoryOption[]): number {
  return options.reduce((sum, opt) => sum + opt.inStock, 0);
}

/**
 * Calculate price range (min-max) across inventory options.
 *
 * @param options - Array of inventory options
 * @param onlyWithStock - If true, only considers options with stock
 * @returns Object with min and max price, or null if no options
 */
export function calculatePriceRange(
  options: InventoryOption[],
  onlyWithStock: boolean = true
): { min: number; max: number } | null {
  const filteredOptions = onlyWithStock
    ? options.filter(opt => opt.inStock > 0)
    : options;

  if (filteredOptions.length === 0) {
    return null;
  }

  const prices = filteredOptions.map(opt => opt.price);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices)
  };
}

/**
 * Get count of unique quality/language combinations with stock.
 *
 * @param options - Array of inventory options
 * @returns Number of unique combinations with stock
 */
export function countAvailableCombinations(options: InventoryOption[]): number {
  const availableOptions = options.filter(opt => opt.inStock > 0);
  const keys = new Set(availableOptions.map(opt =>
    createInventoryKey(opt.quality, opt.language)
  ));
  return keys.size;
}
