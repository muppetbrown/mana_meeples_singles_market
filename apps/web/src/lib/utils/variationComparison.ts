import type { BrowseVariation } from '@/types';
import { formatTreatment, formatFinish } from '@/types/models/card';
import { ENDPOINTS, buildUrl } from '@/lib/api/endpoints';

/**
 * Analyze which fields are common vs different across variations
 */
export interface VariationAnalysis {
  commonFields: Set<string>;
  differentFields: Set<string>;
  allSame: boolean;
}

export function analyzeVariations(variations: BrowseVariation[]): VariationAnalysis {
  if (variations.length === 0) {
    return { commonFields: new Set(), differentFields: new Set(), allSame: true };
  }

  if (variations.length === 1) {
    // Single variation - all fields are "common" by default
    return {
      commonFields: new Set(['treatment', 'finish', 'border_color', 'frame_effect', 'promo_type']),
      differentFields: new Set(),
      allSame: true
    };
  }

  const firstVariation = variations[0];
  const fields = ['treatment', 'finish', 'border_color', 'frame_effect', 'promo_type'] as const;

  const commonFields = new Set<string>();
  const differentFields = new Set<string>();

  for (const field of fields) {
    const firstValue = firstVariation[field] || '';
    const allSame = variations.every(v => (v[field] || '') === firstValue);

    if (allSame) {
      commonFields.add(field);
    } else {
      differentFields.add(field);
    }
  }

  return {
    commonFields,
    differentFields,
    allSame: differentFields.size === 0
  };
}

/**
 * Format a variation showing only the different fields
 * With smart deduplication and concise output
 */
export function formatVariationDifference(
  variation: BrowseVariation,
  analysis: VariationAnalysis
): string {
  const parts: string[] = [];

  // If everything is the same, show all fields (with smart formatting)
  if (analysis.allSame || analysis.differentFields.size === 0) {
    const treatment = formatTreatment(variation.treatment);
    const finish = formatFinish(variation.finish);
    const hasSpecialTreatment = treatment !== 'Standard';

    parts.push(treatment);

    // Only show finish if it's NOT "Regular", OR if there's no special treatment
    if (finish !== 'Regular' || !hasSpecialTreatment) {
      parts.push(finish);
    }

    // Only add border if not already in treatment name
    if (variation.border_color &&
        variation.border_color !== 'black' &&
        !treatment.toLowerCase().includes(variation.border_color.toLowerCase())) {
      parts.push(`${variation.border_color} border`);
    }

    return parts.join(' ');
  }

  // Show only different fields
  let treatment = '';
  let finish = '';

  if (analysis.differentFields.has('treatment') && variation.treatment) {
    treatment = formatTreatment(variation.treatment);
    parts.push(treatment);
  }

  if (analysis.differentFields.has('finish') && variation.finish) {
    finish = formatFinish(variation.finish);
    const hasSpecialTreatment = treatment && treatment !== 'Standard';

    // Only show Regular if there's no special treatment
    if (finish !== 'Regular' || !hasSpecialTreatment) {
      parts.push(finish);
    }
  }

  if (analysis.differentFields.has('border_color') &&
      variation.border_color &&
      variation.border_color !== 'black' &&
      !treatment.toLowerCase().includes(variation.border_color.toLowerCase())) {
    parts.push(`${variation.border_color} border`);
  }

  if (analysis.differentFields.has('frame_effect') && variation.frame_effect) {
    parts.push(variation.frame_effect);
  }

  if (analysis.differentFields.has('promo_type') && variation.promo_type) {
    parts.push(variation.promo_type);
  }

  return parts.join(' ');
}

/**
 * Get a title showing all variation details (for hover)
 */
export function formatVariationFullTitle(variation: BrowseVariation): string {
  const parts: string[] = [];

  if (variation.treatment) parts.push(`Treatment: ${formatTreatment(variation.treatment)}`);
  if (variation.finish) parts.push(`Finish: ${formatFinish(variation.finish)}`);
  if (variation.border_color) parts.push(`Border: ${variation.border_color}`);
  if (variation.frame_effect) parts.push(`Frame: ${variation.frame_effect}`);
  if (variation.promo_type) parts.push(`Promo: ${variation.promo_type}`);
  if (variation.sku) parts.push(`SKU: ${variation.sku}`);

  return parts.join(' • ');
}

/**
 * Fetch variation display override from the API
 * Returns the custom display_text if an override exists, or null if not found
 */
export async function fetchVariationOverride(
  gameId: number | undefined,
  variation: BrowseVariation
): Promise<string | null> {
  try {
    const params: Record<string, any> = {};

    if (gameId) params.game_id = gameId;
    if (variation.treatment) params.treatment = variation.treatment;
    if (variation.finish) params.finish = variation.finish;
    if (variation.border_color) params.border_color = variation.border_color;
    if (variation.frame_effect) params.frame_effect = variation.frame_effect;
    if (variation.promo_type) params.promo_type = variation.promo_type;

    const url = buildUrl(`${ENDPOINTS.ADMIN.VARIATION_OVERRIDES}/lookup`, params);
    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      return data.display_text || null;
    }

    // 404 means no override found, which is expected
    return null;
  } catch (error) {
    console.error('Error fetching variation override:', error);
    return null;
  }
}

/**
 * Get the display text for a variation, checking for overrides first
 * Falls back to auto-generated text if no override exists
 */
export async function getVariationDisplayText(
  gameId: number | undefined,
  variation: BrowseVariation,
  analysis: VariationAnalysis
): Promise<string> {
  // Try to fetch override first
  const override = await fetchVariationOverride(gameId, variation);

  if (override) {
    return override;
  }

  // Fall back to auto-generated text
  return formatVariationDifference(variation, analysis);
}