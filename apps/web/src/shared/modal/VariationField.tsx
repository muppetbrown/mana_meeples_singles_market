// apps/web/src/shared/modal/VariationField.tsx
/**
 * VariationField - Shared component for variation selection/display
 *
 * Can render as either:
 * - Dropdown: For selecting from multiple variations (admin)
 * - Locked field: For displaying a single variation (shop)
 */

import * as React from 'react';
import { formatTreatment, formatFinish } from '@/types/models/card';

export type VariationOption = {
  id: number | string;
  treatment?: string | null;
  finish?: string | null;
  border_color?: string | null;
  in_stock?: number;
};

export type VariationFieldProps = {
  variations: VariationOption[];
  selectedVariation?: VariationOption | null;
  onVariationChange?: (variation: VariationOption) => void;
  locked?: boolean;
  label?: string;
  helpText?: string;
  required?: boolean;
};

export function VariationField({
  variations,
  selectedVariation,
  onVariationChange,
  locked = false,
  label = 'Variation',
  helpText,
  required = true,
}: VariationFieldProps) {
  const formatVariationLabel = (variation: VariationOption): string => {
    const treatment = formatTreatment(variation.treatment);
    const finish = formatFinish(variation.finish);
    const hasSpecialTreatment = treatment !== 'Standard';

    const parts = [treatment];

    // Only show finish if it's NOT "Regular", OR if there's no special treatment
    // This prevents "Borderless Inverted Regular" and keeps it as "Borderless Inverted"
    if (finish !== 'Regular' || !hasSpecialTreatment) {
      parts.push(finish);
    }

    // Only add border_color if:
    // 1. It exists and isn't 'black' (default)
    // 2. Treatment doesn't already mention the border (prevents "Borderless ... borderless border")
    if (variation.border_color &&
        variation.border_color !== 'black' &&
        !treatment.toLowerCase().includes(variation.border_color.toLowerCase())) {
      parts.push(`${variation.border_color} border`);
    }

    if (variation.in_stock !== undefined && variation.in_stock > 0) {
      parts.push(`(${variation.in_stock} in stock)`);
    }

    return parts.filter(Boolean).join(' ');
  };

  // Default help text based on mode
  const defaultHelpText = locked
    ? 'This card has only one variation'
    : variations.length === 1
    ? 'This card has only one variation'
    : 'Select which card variation to add to inventory';

  const finalHelpText = helpText || defaultHelpText;

  // Locked/display-only mode
  if (locked) {
    return (
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100 text-slate-900 cursor-not-allowed">
          {selectedVariation ? formatVariationLabel(selectedVariation) : 'No variation selected'}
        </div>
        {finalHelpText && (
          <p className="text-xs text-slate-500 mt-1">
            {finalHelpText}
          </p>
        )}
      </div>
    );
  }

  // Interactive dropdown mode
  const isDisabled = variations.length === 1;

  return (
    <div>
      <label htmlFor="variation" className="block text-sm font-medium text-slate-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id="variation"
        value={selectedVariation?.id || ''}
        onChange={(e) => {
          const variation = variations.find(v => String(v.id) === e.target.value);
          if (variation && onVariationChange) {
            onVariationChange(variation);
          }
        }}
        disabled={isDisabled}
        className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
          isDisabled ? 'bg-slate-100 text-slate-700 cursor-not-allowed' : 'bg-white text-slate-900'
        }`}
        required={required}
      >
        {!selectedVariation && <option value="" className="text-slate-500">Select variation...</option>}
        {variations.map((variation) => (
          <option key={variation.id} value={variation.id} className="text-slate-900">
            {formatVariationLabel(variation)}
          </option>
        ))}
      </select>
      {finalHelpText && (
        <p className="text-xs text-slate-500 mt-1">
          {finalHelpText}
        </p>
      )}
    </div>
  );
}
