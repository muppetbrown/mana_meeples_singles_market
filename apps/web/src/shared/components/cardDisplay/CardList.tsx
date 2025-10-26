// apps/web/src/features/shop/components/CardList.tsx (excerpt – refactor core rendering)
import * as React from 'react';
import { CardRow } from '@/shared/components/';
import { AddToCartModal } from '@/features/shop/';
import { formatCurrency } from '@/lib/utils/';

// … existing imports remain (remove unused formatFinish, isFoilCard, hasSpecialTreatment)

export default function CardList({ cards, currency, onAddToCart }) {
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
            gameName: card.game_name,
            setName: card.set_name,
            cardNumber: card.card_number,
            rarity: card.rarity,
            imageUrl: card.image_url,
          }}
          badges={card.treatments?.length ? [{ label: `${card.treatments.length} treatments` }] : undefined}
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
        onAdd={onAddToCart}
      />

      {/* Existing ImageModal can be reused; wire to imageCardId */}
    </div>
  );
}