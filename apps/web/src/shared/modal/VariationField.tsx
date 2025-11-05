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
    const parts = [
      formatTreatment(variation.treatment),
      formatFinish(variation.finish),
    ];

    if (variation.border_color && variation.border_color !== 'black') {
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
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 text-slate-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 border-slate-300 rounded-lg bg-zinc-100 dark:bg-zinc-800 bg-slate-100 text-zinc-900 dark:text-zinc-100 text-slate-900 cursor-not-allowed">
          {selectedVariation ? formatVariationLabel(selectedVariation) : 'No variation selected'}
        </div>
        {finalHelpText && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 text-slate-500 mt-1">
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
      <label htmlFor="variation" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 text-slate-700 mb-2">
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
        className={`w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          isDisabled ? 'bg-zinc-100 dark:bg-zinc-800 bg-slate-100 cursor-not-allowed' : 'bg-white dark:bg-zinc-900'
        }`}
        required={required}
      >
        {!selectedVariation && <option value="">Select variation...</option>}
        {variations.map((variation) => (
          <option key={variation.id} value={variation.id}>
            {formatVariationLabel(variation)}
          </option>
        ))}
      </select>
      {finalHelpText && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 text-slate-500 mt-1">
          {finalHelpText}
        </p>
      )}
    </div>
  );
}
