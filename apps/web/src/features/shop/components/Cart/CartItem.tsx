import React from 'react';
import { Minus, Plus, Trash2, Package } from 'lucide-react';
import type { CartItem, Currency } from '@/types';
import { formatPrice } from '@/lib/utils/format';
import { formatFinish } from '@/types';

interface CartItemDisplayProps {
  item: CartItem;
  currency: Currency;
  onUpdateQuantity: (delta: number) => void;
  onRemove: () => void;
}

export const CartItemDisplay: React.FC<CartItemDisplayProps> = ({
  item,
  currency,
  onUpdateQuantity,
  onRemove
}) => {
  const itemTotal = item.price * item.quantity;

  // Create variation display text
  const variations = [];
  // Check for any foil type (including special foils like surgefoil)
  if (item.finish) {
    const lower = item.finish.toLowerCase();
    if (lower.includes('foil') && !lower.includes('non')) {
      variations.push(formatFinish(item.finish));
    }
  }
  if (item.quality && item.quality !== 'Near Mint') {
    variations.push(item.quality);
  }
  if (item.language && item.language !== 'English') {
    variations.push(item.language);
  }

  const variationText = variations.length > 0 ? ` (${variations.join(', ')})` : '';

  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Card Image */}
      <div className="flex-shrink-0">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.card_name}
            className="w-12 h-16 object-cover rounded border"
          />
        ) : (
          <div className="w-12 h-16 bg-gray-100 rounded border flex items-center justify-center">
            <Package className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>

      {/* Card Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 truncate">
          {item.card_name}
          <span className="text-sm text-gray-500">{variationText}</span>
        </h3>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{item.set_name}</span>
          {item.card_number && (
            <>
              <span>•</span>
              <span>#{item.card_number}</span>
            </>
          )}
          {item.rarity && (
            <>
              <span>•</span>
              <span className="capitalize">{item.rarity.toLowerCase()}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
          <span>{formatPrice(item.price, currency)} each</span>
          {item.stock <= 5 && (
            <>
              <span>•</span>
              <span className="text-amber-600 font-medium">
                {item.stock} left in stock
              </span>
            </>
          )}
        </div>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onUpdateQuantity(-1)}
          disabled={item.quantity <= 1}
          className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Decrease quantity"
        >
          <Minus className="w-4 h-4" />
        </button>

        <span className="w-8 text-center font-medium" aria-label={`Quantity: ${item.quantity}`}>
          {item.quantity}
        </span>

        <button
          type="button"
          onClick={() => onUpdateQuantity(1)}
          disabled={item.quantity >= item.stock}
          className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Increase quantity"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Price & Remove */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="font-semibold text-gray-900">
            {formatPrice(itemTotal, currency)}
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          aria-label={`Remove ${item.card_name} from cart`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CartItemDisplay;