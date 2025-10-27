// apps/web/src/features/shop/components/ShopState.tsx
import React from 'react';
import { KeyboardShortcuts } from '@/shared/layout';
import { useShopKeyboardShortcuts } from '@/features/hooks';

interface ShopStateProps {
  // UI State
  showCart: boolean;
  setShowCart: (show: boolean) => void;
  showMiniCart: boolean;
  setShowMiniCart: (show: boolean) => void;
  showCheckout: boolean;
  setShowCheckout: (show: boolean) => void;
  showKeyboardShortcuts: boolean;
  setShowKeyboardShortcuts: (show: boolean) => void;
  showMobileFilters: boolean;
  setShowMobileFilters: (show: boolean) => void;
}

export const ShopState: React.FC<ShopStateProps> = ({
  showCart,
  setShowCart,
  showMiniCart,
  setShowMiniCart,
  showCheckout,
  setShowCheckout,
  showKeyboardShortcuts,
  setShowKeyboardShortcuts,
  showMobileFilters,
  setShowMobileFilters
}) => {
  // Initialize keyboard shortcuts
  useShopKeyboardShortcuts({
    showCart,
    showMobileFilters,
    showKeyboardShortcuts,
    setShowCart,
    setShowMobileFilters,
    setShowKeyboardShortcuts
  });

  return (
    <>
      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcuts
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
    </>
  );
};