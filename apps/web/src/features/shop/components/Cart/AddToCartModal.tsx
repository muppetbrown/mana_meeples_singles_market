// apps/web/src/features/shop/components/CardDisplay/AddToCartModal.tsx
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils/';
import { api, ENDPOINTS } from '@/lib/api';
import type { Currency } from '@/types';
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
  cardId,
  isOpen,
  onClose,
  currency,
  onAdd,
}: {
  cardId: number;
  isOpen: boolean;
  onClose: () => void;
  currency: Currency;
  onAdd: (payload: { inventoryId: number; quantity: number }) => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory-options', cardId],
    queryFn: async () => {
      // Fetch from storefront endpoint which returns card with variations
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
      }>(ENDPOINTS.STOREFRONT.CARD_BY_ID(cardId));

      // Map variations to InventoryOption format
      const options: InventoryOption[] = (response.card.variations || []).map(v => ({
        inventoryId: v.inventory_id,
        quality: v.quality,
        language: v.language,
        priceCents: Math.round((v.price || 0) * 100), // Convert to cents
        inStock: v.stock || 0,
      }));

      return {
        options,
        card: response.card
      };
    },
    enabled: isOpen,
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

  // Reset state when modal opens
  React.useEffect(() => {
    if (!isOpen) return;
    setSelectedQuality('');
    setSelectedLanguage('');
    setQty(1);
  }, [isOpen]);

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
    if (!selected) return;
    onAdd({ inventoryId: selected.inventoryId, quantity: qty });
    onClose();
  };

  if (!isOpen) return null;

  const card = data?.card;

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
        className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-live="polite" aria-atomic="true" className="sr-only" ref={liveRef} />

        {/* Header */}
        {card && (
          <CardVariationHeader
            card={card}
            title="Add to Cart"
            titleId="addToCartTitle"
            onClose={onClose}
            iconType="cart"
          />
        )}

        {/* Body */}
        <div className="p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-mm-teal border-t-transparent rounded-full animate-spin" />
              <p className="ml-3 text-zinc-600 dark:text-zinc-400" role="status">Loading inventory…</p>
            </div>
          )}

          {isError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200" role="alert">Could not load inventory. Please try again.</p>
            </div>
          )}

          {!isLoading && !isError && (
            <form onSubmit={handleConfirm} className="space-y-6">
              {/* Variation Field - Locked since this is a single card */}
              {card && (
                <VariationField
                  variations={[{
                    id: card.id,
                    treatment: card.treatment ?? null,
                    finish: card.finish ?? null,
                    border_color: card.border_color ?? null,
                  }]}
                  selectedVariation={{
                    id: card.id,
                    treatment: card.treatment ?? null,
                    finish: card.finish ?? null,
                    border_color: card.border_color ?? null,
                  }}
                  locked={true}
                />
              )}

              {/* Variation Details Box */}
              {card && (
                <VariationDetailsBox
                  variation={{
                    treatment: card.treatment ?? null,
                    finish: card.finish ?? null,
                    border_color: card.border_color ?? null,
                    frame_effect: card.frame_effect ?? null,
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
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Price:</span>
                      <span className="text-lg font-bold text-mm-teal">
                        {formatCurrency(selected.priceCents, currency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Package className="w-4 h-4" />
                      <span>{selected.inStock} available in stock</span>
                    </div>
                  </div>
                )}

                {/* Quantity Selection */}
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    <Package className="w-4 h-4 inline mr-1" />
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="quantity"
                    type="number"
                    min={1}
                    max={selected ? selected.inStock : 1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Math.min(selected?.inStock ?? 1, Number(e.target.value) || 1)))}
                    disabled={!selected}
                    className="w-32 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-mm-teal focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  />
                </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selected || selected.inStock === 0}
                  className="px-6 py-2 bg-gradient-to-r from-mm-gold to-mm-teal text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg flex items-center gap-2"
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
