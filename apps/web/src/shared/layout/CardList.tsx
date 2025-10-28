// apps/web/src/features/shop/components/CardList.tsx (excerpt – refactor core rendering)
import * as React from 'react';
import { CardRow } from '@/shared/card';
import { AddToCartModal } from '@/features/shop/components';
import { formatCurrency } from '@/lib/utils/';
import type { Currency } from '@/types';

// … existing imports remain (remove unused formatFinish, isFoilCard, hasSpecialTreatment)

type CardListProps = {
  cards: Array<{
    id: number;
    name: string;
    game_name?: string;
    set_name: string;
    card_number?: string;
    rarity?: string;
    image_url?: string;
    treatments?: Array<unknown>;
    lowest_price_cents?: number;
  }>;
  currency: Currency;
  onAddToCart: (payload: { inventoryId: number; quantity: number }) => void;
};

export default function CardList({ cards, currency, onAddToCart }: CardListProps) {
  const [imageCardId, setImageCardId] = React.useState<number | null>(null);
  const [modalCardId, setModalCardId] = React.useState<number | null>(null);

  return (
    <div className="space-y-3">
      {cards.map((card) => (
        <CardRow
          key={card.id}
          identity={{
            id: card.id,
            name: card.name,
            gameName: card.game_name ?? '',
            setName: card.set_name ?? '',
            cardNumber: card.card_number ?? '',
            ...(card.rarity && { rarity: card.rarity }),
            ...(card.image_url && { imageUrl: card.image_url }),
          }}
          badges={card.treatments?.length ? [{ label: `${card.treatments.length} treatments` }] : []}
          onImageOpen={() => setImageCardId(card.id)}
          rightNode={
            <div className="flex items-center gap-2">
              {typeof card.lowest_price_cents === 'number' && (
                <span className="text-sm" aria-label="price from">
                  From {formatCurrency(card.lowest_price_cents, currency)}
                </span>
              )}
              <button
                type="button"
                onClick={() => setModalCardId(card.id)}
                className="rounded-xl bg-indigo-600 text-white px-3 py-2"
              >
                View / Add
              </button>
            </div>
          }
        />
      ))}

      <AddToCartModal
        cardId={modalCardId ?? 0}
        isOpen={modalCardId !== null}
        onClose={() => setModalCardId(null)}
        currency={currency}
        onAdd={(p) => onAddToCart(p)}
      />

      {/* Existing ImageModal can be reused; wire to imageCardId */}
    </div>
  );
}