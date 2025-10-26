import React from 'react';
import { X } from 'lucide-react';
import { formatCurrencySimple } from '@/lib/utils';
import type { Cart, Currency } from '@/types';

interface MiniCartProps {
  cart: Cart;
  currency: Currency;
  onViewCart: () => void;
  onClose?: () => void;
}

export const MiniCart: React.FC<MiniCartProps> = ({
  cart,
  currency,
  onViewCart,
  onClose
}) => {
  const { items, total, itemCount } = cart;

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-lg border border-mm-warmAccent p-4 z-40 max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-mm-darkForest">
          Cart ({itemCount})
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-mm-teal hover:text-mm-darkForest focus:ring-2 focus:ring-mm-forest focus:outline-none rounded"
            aria-label="Close mini cart"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
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
                {item.foil_type && item.foil_type !== 'Regular' && (
                  <div className="text-yellow-600">✨ {item.foil_type}</div>
                )}
              </div>
            </div>
            <div className="text-mm-forest font-semibold">
              {formatCurrencySimple(item.price * item.quantity, currency)}
            </div>
          </div>
        ))}
      </div>

      {items.length > 3 && (
        <p className="text-xs text-mm-teal mt-2">
          + {items.length - 3} more items
        </p>
      )}

      <button 
        onClick={onViewCart} 
        className="btn-mm-primary w-full mt-3"
      >
        View Cart ({formatCurrencySimple(total, currency)})
      </button>
    </div>
  );
};

export default MiniCart;