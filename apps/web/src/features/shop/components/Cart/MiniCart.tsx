import React from 'react';
import { X } from 'lucide-react';
import { formatCurrencySimple } from '@/lib/utils';
import { formatFinish } from '@/types';
import type { Cart, Currency } from '@/types';

interface MiniCartProps {
  isOpen: boolean;
  cart: Cart;
  currency?: Currency;
  onViewCart?: () => void;
  onOpenFullCart?: () => void;
  onClose?: () => void;
  total?: number;
  itemCount?: number;
}

export const MiniCart: React.FC<MiniCartProps> = ({
  isOpen,
  cart,
  currency,
  onViewCart,
  onOpenFullCart,
  onClose,
  total: providedTotal,
  itemCount: providedItemCount
}) => {
  const { items, total: cartTotal, itemCount: cartItemCount } = cart;
  const total = providedTotal ?? cartTotal;
  const itemCount = providedItemCount ?? cartItemCount;

  if (!isOpen || itemCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-2xl border-2 border-mm-warmAccent p-4 z-45 max-w-sm animate-slide-in-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-mm-darkForest text-lg">
          Cart ({itemCount})
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-mm-teal hover:text-mm-darkForest hover:bg-mm-tealLight rounded-full p-1 transition-colors focus:ring-2 focus:ring-mm-forest focus:outline-none"
            aria-label="Close mini cart"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {items.slice(0, 3).map((item) => (
          <div 
            key={`${item.card_id}-${item.variation_key}`} 
            className="flex items-center gap-2 text-sm"
          >
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.card_name}
                className="w-8 h-10 object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{item.card_name}</div>
              <div className="text-xs text-mm-teal">
                <div className="truncate">
                  {item.set_name} #{item.card_number}
                </div>
                <div>{item.quality} × {item.quantity}</div>
                {item.finish && item.finish.toLowerCase().includes('foil') && !item.finish.toLowerCase().includes('non') && (
                  <div className="text-yellow-600">✨ {formatFinish(item.finish)}</div>
                )}
              </div>
            </div>
            <div className="text-mm-forest font-semibold">
              {formatCurrencySimple(item.price * item.quantity, currency || { code: 'USD', symbol: '$', rate: 1, label: 'US Dollar' })}
            </div>
          </div>
        ))}
      </div>

      {items.length > 3 && (
        <p className="text-xs text-mm-teal mt-2 font-medium">
          + {items.length - 3} more item{items.length - 3 > 1 ? 's' : ''}
        </p>
      )}

      {(onViewCart || onOpenFullCart) && (
        <div className="mt-4 pt-3 border-t border-mm-warmAccent">
          <button
            onClick={onViewCart || onOpenFullCart}
            className="btn-mm-primary w-full shadow-lg hover:shadow-xl transition-shadow"
          >
            View Cart ({formatCurrencySimple(total, currency || { code: 'USD', symbol: '$', rate: 1, label: 'US Dollar' })})
          </button>
        </div>
      )}
    </div>
  );
};

export default MiniCart;