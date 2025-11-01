// apps/web/src/features/shop/components/CardDisplay/AddToCartModal.tsx
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils/';
import { api, ENDPOINTS } from '@/lib/api';
import type { Currency } from '@/types';

export type InventoryOption = {
  inventoryId: number; // card_inventory.id
  treatment: string;   // e.g., STANDARD, BORDERLESS
  foilType: string;    // e.g., NONFOIL, FOIL, ETCHED
  quality: string;     // e.g., NM, LP, MP
  language: string;    // e.g., EN, JP
  priceCents: number;
  inStock: number;     // available quantity
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
        card: {
          id: number;
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
        treatment: 'STANDARD', // TODO: Add treatment field to backend response if needed
        foilType: 'NONFOIL',
        quality: v.quality,
        language: v.language,
        priceCents: Math.round((v.price || 0) * 100), // Convert to cents
        inStock: v.stock || 0,
      }));

      return { options };
    },
    enabled: isOpen,
    staleTime: 60_000,
  });

  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [qty, setQty] = React.useState(1);
  const liveRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    // Reset state when opening
    setSelectedId(null);
    setQty(1);
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || !data?.options) return;
    // Auto select the cheapest in-stock option for convenience
    const cheapest = [...data.options]
      .filter(o => o.inStock > 0)
      .sort((a, b) => a.priceCents - b.priceCents)[0];
    if (cheapest) setSelectedId(cheapest.inventoryId);
  }, [isOpen, data?.options]);

  const selected = data?.options.find(o => o.inventoryId === selectedId) || null;

  function handleConfirm() {
    if (!selected) return;
    onAdd({ inventoryId: selected.inventoryId, quantity: qty });
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="addToCartTitle" className="fixed inset-0 z-60">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 sm:inset-y-0 sm:my-auto sm:mx-auto sm:max-w-lg w-full bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-in-up">
        <h2 id="addToCartTitle" className="text-xl font-bold bg-gradient-to-r from-mm-gold to-mm-tealBright bg-clip-text text-transparent mb-1">
          Select variation & quantity
        </h2>
        <div aria-live="polite" aria-atomic="true" className="sr-only" ref={liveRef} />

        {isLoading && <p role="status">Loading inventory…</p>}
        {isError && <p role="alert">Could not load inventory. Please try again.</p>}

        {!isLoading && !isError && (
          <form
            onSubmit={(e) => { e.preventDefault(); handleConfirm(); }}
            className="mt-3 space-y-3"
          >
            <label className="block text-sm font-medium">
              <span className="block mb-1">Variation</span>
              <select
                className="w-full rounded-lg border px-3 py-2"
                value={selectedId ?? ''}
                onChange={(e) => setSelectedId(Number(e.target.value))}
              >
                {data?.options.map((o) => (
                  <option key={o.inventoryId} value={o.inventoryId} disabled={o.inStock === 0}>
                    {`${o.treatment} · ${o.foilType} · ${o.quality} · ${o.language} — ${formatCurrency(o.priceCents, currency)} ${o.inStock === 0 ? '(out of stock)' : ''}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">
              <span className="block mb-1">Quantity</span>
              <input
                type="number"
                min={1}
                max={selected ? selected.inStock : 1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(selected?.inStock ?? 1, Number(e.target.value) || 1)))}
                className="w-28 rounded-lg border px-3 py-2"
              />
              {selected && (
                <p className="mt-1 text-xs text-zinc-600">{selected.inStock} available</p>
              )}
            </label>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border-2 border-mm-warmAccent hover:border-mm-teal hover:bg-mm-tealLight px-6 py-2.5 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selected || selected.inStock === 0}
                className="rounded-xl bg-gradient-to-r from-mm-gold to-mm-teal text-white px-6 py-2.5 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Add to Cart {selected ? `(${formatCurrency(selected.priceCents, currency)})` : ''}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}