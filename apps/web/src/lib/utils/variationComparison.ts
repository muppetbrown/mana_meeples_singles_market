import type { BrowseVariation } from '@/types';

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
 */
export function formatVariationDifference(
  variation: BrowseVariation,
  analysis: VariationAnalysis
): string {
  const parts: string[] = [];

  // If everything is the same, show all fields
  if (analysis.allSame || analysis.differentFields.size === 0) {
    if (variation.treatment) parts.push(formatTreatment(variation.treatment));
    if (variation.finish) parts.push(formatFinish(variation.finish));
    if (variation.border_color && variation.border_color !== 'black') {
      parts.push(`${variation.border_color} border`);
    }
    return parts.join(' ');
  }

  // Show only different fields
  if (analysis.differentFields.has('treatment') && variation.treatment) {
    parts.push(formatTreatment(variation.treatment));
  }

  if (analysis.differentFields.has('finish') && variation.finish) {
    parts.push(formatFinish(variation.finish));
  }

  if (analysis.differentFields.has('border_color') && variation.border_color && variation.border_color !== 'black') {
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

// Helper functions for formatting
function formatTreatment(treatment?: string | null): string {
  if (!treatment) return 'Standard';
  return treatment
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatFinish(finish?: string | null): string {
  if (!finish) return 'Nonfoil';
  return finish
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}