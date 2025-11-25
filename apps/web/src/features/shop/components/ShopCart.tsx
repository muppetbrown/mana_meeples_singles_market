// apps/web/src/features/shop/components/ShopCart.tsx
import React, { useMemo, useCallback } from 'react';
import { CartModal, MiniCart, Checkout } from '@/features/shop/components';
import { useVariationSelection } from '@/features/hooks';
import type { StorefrontCard, CardVariation, CartItem, Currency, Cart } from '@/types';

interface ShopCartProps {
  cards: StorefrontCard[];
  currency: Currency;
  showCart: boolean;
  setShowCart: (show: boolean) => void;
  showMiniCart: boolean;
  setShowMiniCart: (show: boolean) => void;
  showCheckout: boolean;
  setShowCheckout: (show: boolean) => void;
  // Cart state and functions passed from parent
  cart: Cart;
  updateQuantity: (cardId: number, variationKey: string, quantity: number) => void;
  removeFromCart: (cardId: number, variationKey: string) => void;
  clearCart: () => void;
  addNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info', timeoutMs?: number) => void;
}

export const ShopCart: React.FC<ShopCartProps> = ({
  cards,
  currency,
  showCart,
  setShowCart,
  showMiniCart,
  setShowMiniCart,
  showCheckout,
  setShowCheckout,
  cart,
  updateQuantity,
  removeFromCart,
  clearCart,
  addNotification
}) => {

  // Derived state
  const cartTotal = useMemo(() =>
    cart.items.reduce((sum: number, item: CartItem) => sum + (item.price * item.quantity), 0),
    [cart.items]
  );

  const cartCount = useMemo(() =>
    cart.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0),
    [cart.items]
  );

  return (
    <>
      {/* Main Cart Modal */}
      <CartModal
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        cart={cart}
        currency={currency}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onCheckout={() => {
          setShowCart(false);
          setShowCheckout(true);
        }}
      />

      {/* Mini Cart */}
      <MiniCart
        cart={cart}
        currency={currency}
        isOpen={showMiniCart}
        onClose={() => setShowMiniCart(false)}
        onOpenFullCart={() => {
          setShowMiniCart(false);
          setShowCart(true);
        }}
        total={cartTotal}
        itemCount={cartCount}
      />

      {/* Checkout Modal */}
      <Checkout
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        cart={cart}
        total={cartTotal}
        onOrderComplete={() => {
          clearCart();
          setShowCheckout(false);
          addNotification('Order placed successfully!', 'success');
        }}
      />
    </>
  );
};

// Export additional cart utilities for parent component
export const useShopCartUtils = (cards: StorefrontCard[]) => {
  const {
    cart,
    addToCart
  } = useCart();

  const { selections, selectVariation } = useVariationSelection(cards);

  const cartTotal = useMemo(() =>
    cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    [cart]
  );

  const cartCount = useMemo(() =>
    cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const handleVariationChange = useCallback((cardId: number) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    selectVariation(cardId, e.target.value);
  }, [selectVariation]);

  const handleAddToCart = useCallback((card: StorefrontCard, selectedVariation: CardVariation) => () => {
    addToCart({
      card_id: card.id,
      inventory_id: selectedVariation.inventory_id,
      card_name: card.name,
      image_url: card.image_url ?? '',
      quality: selectedVariation.quality,
      price: selectedVariation.price ?? 0,
      stock: selectedVariation.stock ?? 0,
      finish: selectedVariation.finish || 'nonfoil',
      language: selectedVariation.language || 'English',
      game_name: card.game_name,
      set_name: card.set_name,
      rarity: card.rarity || 'Unknown',
      card_number: card.card_number,
      variation_key: `${selectedVariation.quality}-${selectedVariation.finish || 'nonfoil'}-${selectedVariation.language}`
    });
  }, [addToCart]);

  return {
    cartTotal,
    cartCount,
    handleVariationChange,
    handleAddToCart,
    selectedVariations: selections,
    addToCart
  };
};