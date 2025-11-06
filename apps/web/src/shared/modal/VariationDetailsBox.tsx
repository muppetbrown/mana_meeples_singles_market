// apps/web/src/shared/modal/VariationDetailsBox.tsx
/**
 * VariationDetailsBox - Shared component for displaying card variation details
 *
 * Used in both AddToCartModal and AddToInventoryModal to show:
 * - Treatment (e.g., Standard, Borderless, Extended Art)
 * - Finish (e.g., Regular, Foil, Etched)
 * - Border color (if applicable)
 * - Frame effect (if applicable)
 */

import * as React from 'react';
import { formatTreatment, formatFinish } from '@/types/models/card';

export type VariationDetailsBoxProps = {
  variation: {
    treatment?: string | null;
    finish?: string | null;
    border_color?: string | null;
    frame_effect?: string | null;
  };
  title?: string;
};

export function VariationDetailsBox({
  variation,
  title = 'Card Variation Details:',
}: VariationDetailsBoxProps) {
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-sm font-semibold text-blue-900 mb-2">{title}</p>
      <div className="space-y-1.5 text-sm text-slate-700">
        <div>
          <span className="font-medium text-slate-900">Treatment:</span> {formatTreatment(variation.treatment)}
        </div>
        <div>
          <span className="font-medium text-slate-900">Finish:</span> {formatFinish(variation.finish)}
        </div>
        {variation.border_color && (
          <div>
            <span className="font-medium text-slate-900">Border:</span> {variation.border_color}
          </div>
        )}
        {variation.frame_effect && (
          <div>
            <span className="font-medium text-slate-900">Frame:</span> {variation.frame_effect}
          </div>
        )}
      </div>
    </div>
  );
}
