// apps/web/src/components/admin/AddToInventoryModal.tsx
/**
 * Add to Inventory Modal - Unified and Refactored
 *
 * @module AddToInventoryModal
 *
 * ## Recent Improvements (Secondary Sweep)
 * - **Shared Enums**: Now uses centralized QUALITY_OPTIONS and LANGUAGE_OPTIONS
 * - **Type Safety**: Quality and Language types are now strongly typed enums
 * - **Enhanced UX**: Dynamic quality descriptions and native language names
 * - **Validation**: Uses shared validation utilities for consistency
 * - **Consistency**: Matches shop-facing patterns where applicable
 *
 * ## Architecture
 * - Cards have variation metadata (treatment, finish, border_color, etc.)
 * - Modal displays card's native variation properties
 * - User selects: Variation → Quality → Language → Price → Stock
 * - Three-stage selection ensures proper inventory entry
 *
 * ## Data Flow
 * 1. Receive BrowseBaseCard with variations array
 * 2. User selects variation (treatment/finish combo)
 * 3. User selects quality grade (from centralized enum)
 * 4. User selects language (from centralized enum with native names)
 * 5. Price auto-populates or manual entry
 * 6. Submit creates card_inventory entry with all selections
 *
 * @see {@link /types/enums/inventory.ts} - Shared enums and validation
 * @see {@link /lib/utils/inventoryUtils.ts} - Shared inventory utilities
 */

import React from 'react';
import { X, Package, DollarSign, Sparkles } from 'lucide-react';
import type { Card, BrowseBaseCard, BrowseVariation } from '@/types';
import {
  formatTreatment,
  formatFinish,
  formatVariationLabel,
  getFinishBadgeStyle
} from '@/types/models/card';
import { SingleCardPriceRefresh } from './SingleCardPriceRefresh';
import OptimizedImage from '@/shared/media/OptimizedImage';

// ---------- Types ----------
/**
 * Form data structure for adding inventory
 * Now uses typed Quality and Language enums for type safety
 */
type AddFormData = {
  quality: Quality;  // Type-safe quality from enum
  price: string;     // String for input, converted to number on submit
  stock_quantity: number;
  language: Language;  // Type-safe language from enum
  useAutomatedPrice: boolean;  // Whether to use automated price from price source
};

interface AddToInventoryModalProps {
  card: BrowseBaseCard;                 // Card with variations array
  selectedVariation?: BrowseVariation;  // Currently selected variation
  onVariationChange: (variation: BrowseVariation) => void;  // Handle variation change
  formData: AddFormData;
  onFormChange: (data: AddFormData) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}

// ---------- Imports for Shared Enums ----------
import {
  QUALITY_OPTIONS,
  LANGUAGE_OPTIONS,
  DEFAULT_QUALITY,
  DEFAULT_LANGUAGE,
  getQualityDescription,
  getLanguageDisplayName,
  type Quality,
  type Language
} from '@/types/enums/inventory';
import { formatPriceForStorage } from '@/lib/utils/inventoryUtils';

// Note: FOIL_OPTIONS removed - foil information comes from card.finish
// Note: Quality and Language options now imported from centralized enum module

/**
 * Get the appropriate automated price for a variation based on its finish
 */
const getAutomatedPrice = (variation?: BrowseVariation): number | null => {
  if (!variation) return null;

  const finish = variation.finish?.toLowerCase() || 'nonfoil';

  // Check for nonfoil first (before checking for 'foil' substring)
  if (finish.includes('non') || finish === 'nonfoil') {
    return variation.base_price ?? null;
  }

  // For foil/etched finishes, use foil_price
  if (finish.includes('foil') || finish.includes('etched')) {
    return variation.foil_price ?? null;
  }

  // Default to base_price for unknown finishes
  return variation.base_price ?? null;
};

// ---------- Component ----------
const AddToInventoryModal: React.FC<AddToInventoryModalProps> = ({
  card,
  selectedVariation,
  onVariationChange,
  formData,
  onFormChange,
  onSave,
  onClose,
  saving,
}) => {
  // Prevent modal close when clicking inside
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Handle form field changes
  const handleChange = (field: keyof AddFormData, value: string | number | boolean) => {
    const newFormData = {
      ...formData,
      [field]: value,
    };

    // If toggling useAutomatedPrice, update the price accordingly
    if (field === 'useAutomatedPrice') {
      if (value === true) {
        // Populate with automated price
        const automatedPrice = getAutomatedPrice(selectedVariation);
        newFormData.price = automatedPrice !== null ? automatedPrice.toString() : '';
      } else {
        // Clear the price for manual entry
        newFormData.price = '';
      }
    }

    onFormChange(newFormData);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  // Determine if selected variation is special/premium based on treatment or finish
  const isSpecialCard = selectedVariation?.treatment && selectedVariation.treatment !== 'STANDARD' && selectedVariation.treatment !== 'standard';
  const isFoilCard = selectedVariation?.finish &&
    selectedVariation.finish.toLowerCase() !== 'nonfoil' &&
    (selectedVariation.finish.toLowerCase().includes('foil') || selectedVariation.finish.toLowerCase().includes('etched'));

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={handleModalClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200 gap-4">
          {/* Left: Card Image */}
          <div className="flex-shrink-0">
            <div className="relative w-24 h-32 rounded-lg overflow-hidden border-2 border-slate-200 shadow-md">
              <OptimizedImage
                src={card.image_url || '/images/card-back-placeholder.svg'}
                alt={card.name}
                width={96}
                height={128}
                className="w-full h-full object-cover"
                placeholder="blur"
                priority={true}
              />
              {/* Icon overlay on card image */}
              <div className={`absolute top-1 right-1 p-1.5 rounded-md ${isSpecialCard || isFoilCard ? 'bg-gradient-to-br from-amber-100 to-yellow-100' : 'bg-blue-100'}`}>
                {isSpecialCard || isFoilCard ? (
                  <Sparkles className="w-4 h-4 text-amber-600" />
                ) : (
                  <Package className="w-4 h-4 text-blue-600" />
                )}
              </div>
            </div>
          </div>

          {/* Center: Card Info */}
          <div className="flex-1 min-w-0">
            <h2 id="modal-title" className="text-xl font-bold text-slate-900">
              Add to Inventory
            </h2>
            <div className="mt-2 space-y-1">
              <p className="text-base font-semibold text-slate-800">
                {card.name}
              </p>
              {card.game_name && (
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Game:</span> {card.game_name}
                </p>
              )}
              <p className="text-sm text-slate-600">
                <span className="font-medium">Set:</span> {card.set_name}
              </p>
            </div>
          </div>

          {/* Right: Close Button */}
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Variation Selector - Always show, but disable if only one variation */}
          {card.variations && card.variations.length > 0 && (
            <div className="mb-4">
              <label htmlFor="variation" className="block text-sm font-medium text-slate-700 mb-2">
                Variation <span className="text-red-500">*</span>
              </label>
              <select
                id="variation"
                value={selectedVariation?.id || ''}
                onChange={(e) => {
                  const variation = card.variations.find(v => v.id === Number(e.target.value));
                  if (variation) onVariationChange(variation);
                }}
                disabled={card.variations.length === 1}
                className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  card.variations.length === 1 ? 'bg-slate-100 cursor-not-allowed' : ''
                }`}
                required
              >
                {!selectedVariation && <option value="">Select variation...</option>}
                {card.variations.map((variation) => (
                  <option key={variation.id} value={variation.id}>
                    {formatTreatment(variation.treatment)} {formatFinish(variation.finish)}
                    {variation.border_color && variation.border_color !== 'black' && ` - ${variation.border_color} border`}
                    {variation.in_stock > 0 && ` (${variation.in_stock} in stock)`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {card.variations.length === 1
                  ? 'This card has only one variation'
                  : 'Select which card variation to add to inventory'}
              </p>
            </div>
          )}

          {/* Show selected variation details */}
          {selectedVariation && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">Selected Variation:</p>
              <div className="space-y-1 text-sm text-blue-800">
                <div><span className="font-medium">Treatment:</span> {formatTreatment(selectedVariation.treatment)}</div>
                <div><span className="font-medium">Finish:</span> {formatFinish(selectedVariation.finish)}</div>
                {selectedVariation.border_color && (
                  <div><span className="font-medium">Border:</span> {selectedVariation.border_color}</div>
                )}
                {selectedVariation.frame_effect && (
                  <div><span className="font-medium">Frame:</span> {selectedVariation.frame_effect}</div>
                )}
              </div>
            </div>
          )}

          {/* Card Basic Info */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Card Details</h3>

            {/* Card Number */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600 min-w-[100px]">Card Number:</span>
              <span className="font-medium text-slate-900">{card.card_number}</span>
            </div>

            {/* Set Name */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600 min-w-[100px]">Set:</span>
              <span className="font-medium text-slate-900">{card.set_name}</span>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Inventory Details</h3>

            {/* Quality */}
            <div className="mb-4">
              <label htmlFor="quality" className="block text-sm font-medium text-slate-700 mb-2">
                Quality <span className="text-red-500">*</span>
              </label>
              <select
                id="quality"
                value={formData.quality}
                onChange={(e) => handleChange('quality', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                title={formData.quality ? getQualityDescription(formData.quality) : 'Select card quality'}
              >
                {QUALITY_OPTIONS.map((quality) => (
                  <option key={quality} value={quality} title={getQualityDescription(quality)}>
                    {quality}
                  </option>
                ))}
              </select>
              {/* Enhanced help text with dynamic description */}
              <p className="text-xs text-slate-500 mt-1">
                {formData.quality ? getQualityDescription(formData.quality) : 'Select the physical condition of the card'}
              </p>
            </div>

            {/* Foil Type section removed - finish is already displayed in card variation details above */}

            {/* Language */}
            <div className="mb-4">
              <label htmlFor="language" className="block text-sm font-medium text-slate-700 mb-2">
                Language <span className="text-red-500">*</span>
              </label>
              <select
                id="language"
                value={formData.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {LANGUAGE_OPTIONS.map((language) => (
                  <option key={language} value={language}>
                    {getLanguageDisplayName(language)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Language printed on the card
              </p>
            </div>

            {/* Price and Stock Quantity (Side by Side) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Price with Refresh Button */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-slate-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Price (NZD) <span className="text-red-500">*</span>
                </label>

                <div className="flex items-center gap-2">
                  <input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    disabled={formData.useAutomatedPrice}
                    className={`flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formData.useAutomatedPrice ? 'bg-slate-100 cursor-not-allowed' : ''
                    }`}
                    placeholder="0.00"
                    required
                  />
                  {/* Price refresh button - Only works for MTG cards with Scryfall data */}
                  {selectedVariation && card.game_name?.toLowerCase().includes('magic') && selectedVariation.scryfall_id && (
                    <SingleCardPriceRefresh
                      card={{
                        id: selectedVariation.id,
                        name: card.name,
                        set_name: card.set_name,
                        set_id: card.set_id || 0,
                        scryfall_id: selectedVariation.scryfall_id,
                        finish: selectedVariation.finish || 'nonfoil',
                        ...(selectedVariation.price !== null && selectedVariation.price !== undefined && { price: selectedVariation.price }),
                      }}
                      onRefreshComplete={(success, count) => {
                        if (success) {
                          // After refresh, re-enable automated price checkbox
                          alert(`Successfully refreshed prices for ${count} variation(s). Reload the page to see updated prices.`);
                        }
                      }}
                      variant="icon"
                    />
                  )}
                </div>

                {/* Automated price checkbox - Below the price input */}
                {selectedVariation && (selectedVariation.base_price !== null || selectedVariation.foil_price !== null) && selectedVariation.price_source && (
                  <div className="mt-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.useAutomatedPrice}
                        onChange={(e) => handleChange('useAutomatedPrice', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-slate-700">
                        Use {formatVariationLabel(selectedVariation.price_source)} price
                        {getAutomatedPrice(selectedVariation) !== null && (
                          <span className="font-semibold ml-1">
                            (${getAutomatedPrice(selectedVariation)?.toFixed(2)})
                          </span>
                        )}
                      </span>
                    </label>
                  </div>
                )}

                {selectedVariation && !card.game_name?.toLowerCase().includes('magic') && (
                  <p className="text-xs text-slate-500 mt-1">
                    Price refresh only available for Magic: The Gathering cards
                  </p>
                )}
                {selectedVariation && card.game_name?.toLowerCase().includes('magic') && !selectedVariation.scryfall_id && (
                  <p className="text-xs text-slate-500 mt-1">
                    This card has no Scryfall ID and cannot be refreshed
                  </p>
                )}
              </div>

              {/* Stock Quantity */}
              <div>
                <label htmlFor="stock_quantity" className="block text-sm font-medium text-slate-700 mb-2">
                  <Package className="w-4 h-4 inline mr-1" />
                  Stock Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  id="stock_quantity"
                  type="number"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) => handleChange('stock_quantity', parseInt(e.target.value, 10) || 0)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  required
                />
              </div>
            </div> 
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.price || formData.stock_quantity < 0}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Add to Inventory
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddToInventoryModal;