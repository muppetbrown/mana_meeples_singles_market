// apps/web/src/features/shop/components/CardDisplay/AddToCartModal.tsx
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils/';
import { api, ENDPOINTS } from '@/lib/api';
import type { Currency, BrowseBaseCard, BrowseVariation } from '@/types';
import { ShoppingCart, Package } from 'lucide-react';
import {
  CardVariationHeader,
  VariationField,
  VariationDetailsBox,
  QualityLanguageSelectors,
} from '@/shared/modal';

export type InventoryOption = {
  inventoryId: number; // card_inventory.id
  quality: string;     // e.g., NM, LP, MP
  language: string;    // e.g., EN, JP
  priceCents: number;
  inStock: number;     // available quantity
};

type CardData = {
  id: number;
  name: string;
  image_url?: string;
  game_name?: string;
  set_name?: string;
  card_number?: string;
  treatment?: string;
  finish?: string;
  rarity?: string;
  border_color?: string;
  frame_effect?: string;
};

export function AddToCartModal({
  card,
  selectedVariationId,
  isOpen,
  onClose,
  currency,
  onAdd,
}: {
  card: BrowseBaseCard;
  selectedVariationId: number | null;
  isOpen: boolean;
  onClose: () => void;
  currency: Currency;
  onAdd: (payload: { cardId: number; inventoryId: number; quantity: number }) => void;
}) {
  // State for selected variation (within the modal)
  const [selectedVariation, setSelectedVariation] = React.useState<BrowseVariation | null>(null);

  // Initialize selected variation when modal opens
  React.useEffect(() => {
    if (!isOpen) return;

    // Find the variation that was selected in the grid
    const initialVariation = card.variations.find(v => v.id === selectedVariationId) ||
                            card.variations.find(v => v.in_stock > 0) ||
                            card.variations[0];
    setSelectedVariation(initialVariation || null);
  }, [isOpen, selectedVariationId, card.variations]);

  // Fetch inventory options for the selected variation
  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory-options', selectedVariation?.id],
    queryFn: async () => {
      if (!selectedVariation) return { options: [] };

      // Fetch from storefront endpoint which returns card with inventory variations
      const response = await api.get<{
        card: CardData & {
          variations: Array<{
            inventory_id: number;
            quality: string;
            language: string;
            stock: number;
            price: number;
          }>;
        };
      }>(ENDPOINTS.STOREFRONT.CARD_BY_ID(selectedVariation.id));

      // Map variations to InventoryOption format
      const options: InventoryOption[] = (response.card.variations || []).map(v => ({
        inventoryId: v.inventory_id,
        quality: v.quality,
        language: v.language,
        priceCents: Math.round((v.price || 0) * 100), // Convert to cents
        inStock: v.stock || 0,
      }));

      return { options };
    },
    enabled: isOpen && !!selectedVariation,
    staleTime: 60_000,
  });

  const [selectedQuality, setSelectedQuality] = React.useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = React.useState<string>('');
  const [qty, setQty] = React.useState(1);
  const liveRef = React.useRef<HTMLDivElement>(null);

  // Get unique values for dropdowns
  const qualities = React.useMemo(() => {
    if (!data?.options) return [];
    return Array.from(new Set(data.options.map(o => o.quality))).sort();
  }, [data?.options]);

  const languages = React.useMemo(() => {
    if (!data?.options) return [];
    return Array.from(new Set(data.options.map(o => o.language))).sort();
  }, [data?.options]);

  // Reset state when modal opens or variation changes
  React.useEffect(() => {
    if (!isOpen) return;
    setSelectedQuality('');
    setSelectedLanguage('');
    setQty(1);
  }, [isOpen, selectedVariation?.id]);

  // Auto-select first available options when data loads
  React.useEffect(() => {
    if (!isOpen || !data?.options || data.options.length === 0) return;

    // Find cheapest in-stock option
    const cheapest = [...data.options]
      .filter(o => o.inStock > 0)
      .sort((a, b) => a.priceCents - b.priceCents)[0];

    if (cheapest) {
      setSelectedQuality(cheapest.quality);
      setSelectedLanguage(cheapest.language);
    }
  }, [isOpen, data?.options]);

  // Find the selected inventory option based on current selections
  const selected = React.useMemo(() => {
    if (!data?.options || !selectedQuality || !selectedLanguage) {
      return null;
    }
    return data.options.find(
      o => o.quality === selectedQuality && o.language === selectedLanguage
    ) || null;
  }, [data?.options, selectedQuality, selectedLanguage]);

  // Get available options based on current selections
  const availableQualities = React.useMemo(() => {
    if (!data?.options) return qualities;
    return Array.from(new Set(data.options.map(o => o.quality))).sort();
  }, [data?.options, qualities]);

  const availableLanguages = React.useMemo(() => {
    if (!data?.options || !selectedQuality) return languages;
    return Array.from(new Set(
      data.options
        .filter(o => o.quality === selectedQuality)
        .map(o => o.language)
    )).sort();
  }, [data?.options, selectedQuality, languages]);

  const handleConfirm = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selected || !selectedVariation) return;
    onAdd({
      cardId: selectedVariation.id,
      inventoryId: selected.inventoryId,
      quantity: qty
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="addToCartTitle"
      className="fixed inset-0 z-60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" aria-hidden="true" />

      <div
        className="relative bg-white rounded-lg shadow-xl border-2 border-mm-warmAccent max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-live="polite" aria-atomic="true" className="sr-only" ref={liveRef} />

        {/* Header */}
        <CardVariationHeader
          card={{
            name: card.name,
            image_url: selectedVariation?.image || card.image_url,
            game_name: card.game_name,
            set_name: card.set_name,
            card_number: card.card_number,
            treatment: selectedVariation?.treatment,
            finish: selectedVariation?.finish,
          }}
          title="Add to Cart"
          titleId="addToCartTitle"
          onClose={onClose}
          iconType="cart"
        />

        {/* Body */}
        <div className="p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-mm-teal border-t-transparent rounded-full animate-spin" />
              <p className="ml-3 text-mm-teal" role="status">Loading inventory…</p>
            </div>
          )}

          {isError && (
            <div className="bg-mm-tealLight border-2 border-mm-teal rounded-lg p-4">
              <p className="text-mm-darkForest font-semibold" role="alert">Could not load inventory. Please try again.</p>
            </div>
          )}

          {!isLoading && !isError && (
            <form onSubmit={handleConfirm} className="space-y-6">
              {/* Variation Field - Allow selection if multiple variations */}
              {card.variations.filter(v => v.in_stock > 0).length > 1 ? (
                <VariationField
                  variations={card.variations.filter(v => v.in_stock > 0).map(v => ({
                    id: v.id,
                    treatment: v.treatment ?? null,
                    finish: v.finish ?? null,
                    border_color: v.border_color ?? null,
                    in_stock: v.in_stock,
                  }))}
                  selectedVariation={selectedVariation ? {
                    id: selectedVariation.id,
                    treatment: selectedVariation.treatment ?? null,
                    finish: selectedVariation.finish ?? null,
                    border_color: selectedVariation.border_color ?? null,
                    in_stock: selectedVariation.in_stock,
                  } : null}
                  onVariationChange={(variation) => {
                    const fullVariation = card.variations.find(v => v.id === variation.id);
                    if (fullVariation) setSelectedVariation(fullVariation);
                  }}
                  locked={false}
                />
              ) : (
                <VariationField
                  variations={card.variations.filter(v => v.in_stock > 0).map(v => ({
                    id: v.id,
                    treatment: v.treatment ?? null,
                    finish: v.finish ?? null,
                    border_color: v.border_color ?? null,
                    in_stock: v.in_stock,
                  }))}
                  selectedVariation={selectedVariation ? {
                    id: selectedVariation.id,
                    treatment: selectedVariation.treatment ?? null,
                    finish: selectedVariation.finish ?? null,
                    border_color: selectedVariation.border_color ?? null,
                    in_stock: selectedVariation.in_stock,
                  } : null}
                  locked={true}
                />
              )}

              {/* Variation Details Box */}
              {selectedVariation && (
                <VariationDetailsBox
                  variation={{
                    treatment: selectedVariation.treatment ?? null,
                    finish: selectedVariation.finish ?? null,
                    border_color: selectedVariation.border_color ?? null,
                    frame_effect: selectedVariation.frame_effect ?? null,
                  }}
                />
              )}

              {/* Quality and Language Selectors */}
              <QualityLanguageSelectors
                qualities={availableQualities}
                selectedQuality={selectedQuality}
                onQualityChange={setSelectedQuality}
                languages={availableLanguages}
                selectedLanguage={selectedLanguage}
                onLanguageChange={setSelectedLanguage}
                languageDisabled={!selectedQuality}
              />

                {/* Price & Stock Info */}
                {selected && (
                  <div className="p-4 bg-mm-tealLight rounded-lg border-2 border-mm-warmAccent">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-mm-forest">Price:</span>
                      <span className="text-lg font-bold text-mm-teal">
                        {formatCurrency(selected.priceCents, currency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-mm-teal">
                      <Package className="w-4 h-4" />
                      <span>{selected.inStock} available in stock</span>
                    </div>
                  </div>
                )}

                {/* Quantity Selection */}
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-mm-forest mb-2">
                    <Package className="w-4 h-4 inline mr-1" />
                    Quantity <span className="text-mm-teal">*</span>
                  </label>
                  <input
                    id="quantity"
                    type="number"
                    min={1}
                    max={selected ? selected.inStock : 1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Math.min(selected?.inStock ?? 1, Number(e.target.value) || 1)))}
                    disabled={!selected}
                    className="input-mm w-32 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  />
                </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-mm-warmAccent">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-mm-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selected || selected.inStock === 0}
                  className="btn-mm-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add to Cart
                  {selected && selected.inStock > 0 && (
                    <span className="ml-1">({formatCurrency(selected.priceCents, currency)})</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
