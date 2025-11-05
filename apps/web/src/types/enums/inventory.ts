/**
 * Inventory Enums and Constants
 *
 * Centralized, validated enums for inventory management. These enums are used
 * across both shop and admin interfaces to ensure consistency and prevent
 * data integrity issues.
 *
 * @module types/enums/inventory
 *
 * ## Design Principles
 * - **Single Source of Truth**: All quality and language values defined here
 * - **Type Safety**: Const assertions enable literal type inference
 * - **Backend Aligned**: Must match backend validation schemas
 * - **Extensible**: Can add new values without breaking existing code
 *
 * ## Usage
 * ```ts
 * import { QUALITY_OPTIONS, Quality, isValidQuality } from '@/types/enums/inventory';
 *
 * // Type-safe quality selection
 * const quality: Quality = 'Near Mint';
 *
 * // Runtime validation
 * if (isValidQuality(userInput)) {
 *   // Safe to use
 * }
 * ```
 */

// ============================================================================
// QUALITY ENUMS
// ============================================================================

/**
 * Standard card quality grades used across the trading card industry.
 *
 * Grades from best to worst condition:
 * - **Near Mint (NM)**: Like new, minimal wear
 * - **Lightly Played (LP)**: Minor wear, still tournament legal
 * - **Moderately Played (MP)**: Noticeable wear, playable
 * - **Heavily Played (HP)**: Significant wear, still recognizable
 * - **Damaged (DMG)**: Major damage, collectors only
 */
export const QUALITY_OPTIONS = [
  'Near Mint',
  'Lightly Played',
  'Moderately Played',
  'Heavily Played',
  'Damaged'
] as const;

/**
 * Quality grade type - literal union of all valid quality values
 */
export type Quality = typeof QUALITY_OPTIONS[number];

/**
 * Short-form quality codes for compact display
 */
export const QUALITY_CODES: Record<Quality, string> = {
  'Near Mint': 'NM',
  'Lightly Played': 'LP',
  'Moderately Played': 'MP',
  'Heavily Played': 'HP',
  'Damaged': 'DMG'
} as const;

/**
 * Quality descriptions for tooltips and help text
 */
export const QUALITY_DESCRIPTIONS: Record<Quality, string> = {
  'Near Mint': 'Like new with minimal wear. Perfect for collectors.',
  'Lightly Played': 'Minor wear from play. Still tournament legal.',
  'Moderately Played': 'Noticeable wear but fully playable.',
  'Heavily Played': 'Significant wear. Best for casual play.',
  'Damaged': 'Major damage. Playable but not collectible.'
} as const;

// ============================================================================
// LANGUAGE ENUMS
// ============================================================================

/**
 * Supported card languages.
 *
 * Covers major TCG markets with room for expansion. Order represents
 * approximate market share for most trading card games.
 */
export const LANGUAGE_OPTIONS = [
  'English',
  'Japanese',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Chinese',
  'Korean',
  'Russian'
] as const;

/**
 * Language type - literal union of all valid language values
 */
export type Language = typeof LANGUAGE_OPTIONS[number];

/**
 * ISO 639-1 language codes for API compatibility
 */
export const LANGUAGE_CODES: Record<Language, string> = {
  'English': 'en',
  'Japanese': 'ja',
  'Spanish': 'es',
  'French': 'fr',
  'German': 'de',
  'Italian': 'it',
  'Portuguese': 'pt',
  'Chinese': 'zh',
  'Korean': 'ko',
  'Russian': 'ru'
} as const;

/**
 * Full language names for display (matches enum keys)
 */
export const LANGUAGE_NAMES: Record<Language, string> = {
  'English': 'English',
  'Japanese': '日本語 (Japanese)',
  'Spanish': 'Español (Spanish)',
  'French': 'Français (French)',
  'German': 'Deutsch (German)',
  'Italian': 'Italiano (Italian)',
  'Portuguese': 'Português (Portuguese)',
  'Chinese': '中文 (Chinese)',
  'Korean': '한국어 (Korean)',
  'Russian': 'Русский (Russian)'
} as const;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Type guard to check if a value is a valid Quality
 *
 * @param value - Value to check
 * @returns True if value is a valid Quality enum member
 *
 * @example
 * ```ts
 * if (isValidQuality(userInput)) {
 *   const quality: Quality = userInput; // Type-safe!
 * }
 * ```
 */
export function isValidQuality(value: unknown): value is Quality {
  return typeof value === 'string' &&
    (QUALITY_OPTIONS as readonly string[]).includes(value);
}

/**
 * Type guard to check if a value is a valid Language
 *
 * @param value - Value to check
 * @returns True if value is a valid Language enum member
 */
export function isValidLanguage(value: unknown): value is Language {
  return typeof value === 'string' &&
    (LANGUAGE_OPTIONS as readonly string[]).includes(value);
}

/**
 * Get quality code from full quality name
 *
 * @param quality - Full quality name
 * @returns Short quality code (e.g., 'NM')
 */
export function getQualityCode(quality: Quality): string {
  return QUALITY_CODES[quality];
}

/**
 * Get language code from full language name
 *
 * @param language - Full language name
 * @returns ISO 639-1 language code
 */
export function getLanguageCode(language: Language): string {
  return LANGUAGE_CODES[language];
}

/**
 * Get quality description for tooltips
 *
 * @param quality - Quality grade
 * @returns Human-readable description
 */
export function getQualityDescription(quality: Quality): string {
  return QUALITY_DESCRIPTIONS[quality];
}

/**
 * Get display name for language (includes native script)
 *
 * @param language - Language
 * @returns Display name with native script
 */
export function getLanguageDisplayName(language: Language): string {
  return LANGUAGE_NAMES[language];
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default quality for new inventory entries
 */
export const DEFAULT_QUALITY: Quality = 'Near Mint';

/**
 * Default language for new inventory entries
 */
export const DEFAULT_LANGUAGE: Language = 'English';

/**
 * Quality priority order (best to worst)
 */
export const QUALITY_PRIORITY: readonly Quality[] = [
  'Near Mint',
  'Lightly Played',
  'Moderately Played',
  'Heavily Played',
  'Damaged'
] as const;

/**
 * Language priority order (most common to least common in market)
 */
export const LANGUAGE_PRIORITY: readonly Language[] = [
  'English',
  'Japanese',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Chinese',
  'Korean',
  'Russian'
] as const;
