import React from 'react';
import { ShoppingCart, X, Plus, Minus } from 'lucide-react';
import { formatCurrencySimple } from '@/lib/utils';
import type { Cart, Currency, CartItem } from '@/types';

interface CartModalProps {
  isOpen: boolean;
  cart: Cart;
  currency: Currency;
  onClose: () => void;
  onCheckout: () => void;
  onUpdateQuantity: (cardId: number, variationKey: string, quantity: number) => void;
  onRemoveItem: (cardId: number, variationKey: string) => void;
}

export const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  cart,
  currency,
  onClose,
  onCheckout,
  onUpdateQuantity,
  onRemoveItem
}) => {
  const { items, total, itemCount } = cart;

  const handleQuantityChange = (item: CartItem, delta: number) => {
    const newQuantity = item.quantity + delta;
    if (newQuantity > 0 && newQuantity <= item.stock) {
      onUpdateQuantity(item.card_id, item.variation_key, newQuantity);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold text-mm-darkForest">
            Shopping Cart
          </h2>
          <button
            onClick={onClose}
            className="text-mm-teal hover:text-mm-darkForest focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none rounded"
            aria-label="Close cart"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {itemCount === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-mm-teal mx-auto mb-4" />
              <p className="text-mm-forest">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <CartItemRow
                  key={`${item.card_id}-${item.variation_key}`}
                  item={item}
                  currency={currency}
                  onQuantityChange={(delta) => handleQuantityChange(item, delta)}
                  onRemove={() => onRemoveItem(item.card_id, item.variation_key)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {itemCount > 0 && (
          <div className="p-6 border-t bg-mm-cream">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-mm-darkForest">
                Total:
              </span>
              <span className="text-2xl font-bold text-mm-forest">
                {formatCurrencySimple(total, currency)}
              </span>
            </div>
            <button 
              onClick={onCheckout} 
              className="btn-mm-primary w-full"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper component for cart item row
interface CartItemRowProps {
  item: CartItem;
  currency: Currency;
  onQuantityChange: (delta: number) => void;
  onRemove: () => void;
}

const CartItemRow: React.FC<CartItemRowProps> = ({
  item,
  currency,
  onQuantityChange,
  onRemove
}) => {
  return (
    <div className="flex gap-4 p-4 bg-mm-tealLight rounded-lg border border-mm-warmAccent">
      {/* Image */}
      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.card_name}
          className="w-20 h-28 object-contain rounded bg-white"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 
              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="112"%3E%3Crect fill="%231e293b" width="80" height="112"/%3E%3C/svg%3E';
          }}
        />
      )}

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm mb-1 line-clamp-2">
          {item.card_name}
        </h3>
        <div className="text-xs text-mm-teal mb-2 space-y-1">
          <div className="font-medium">{item.game_name}</div>
          <div>{item.set_name} #{item.card_number}</div>
          <div>{item.quality}</div>
          {item.foil_type && item.foil_type !== 'Regular' && (
            <div className="flex items-center gap-1">
              <span>✨</span>
              <span className="font-medium text-yellow-600">
                {item.foil_type}
              </span>
            </div>
          )}
          {item.language && item.language !== 'English' && (
            <div>Language: {item.language}</div>
          )}
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => onQuantityChange(-1)}
            disabled={item.quantity <= 1}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-mm-warmAccent hover:bg-mm-teal hover:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
            aria-label="Decrease quantity"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="font-medium min-w-[2rem] text-center">
            {item.quantity}
          </span>
          <button
            onClick={() => onQuantityChange(1)}
            disabled={item.quantity >= item.stock}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-mm-warmAccent hover:bg-mm-teal hover:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
            aria-label="Increase quantity"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onRemove}
            className="ml-auto text-red-600 hover:text-red-700 focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none rounded"
            aria-label="Remove item from cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Price */}
      <div className="text-right">
        <div className="font-bold text-mm-forest">
          {formatCurrencySimple(item.price * item.quantity, currency)}
        </div>
        <div className="text-xs text-mm-teal mt-1">
          {formatCurrencySimple(item.price, currency)} each
        </div>
      </div>
    </div>
  );
};

export default CartModal;