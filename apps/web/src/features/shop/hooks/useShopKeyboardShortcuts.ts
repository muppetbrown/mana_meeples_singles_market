import { useEffect } from 'react';

interface UseShopKeyboardShortcutsParams {
  showCart: boolean;
  showMobileFilters: boolean;
  showKeyboardShortcuts: boolean;
  setShowCart: (show: boolean) => void;
  setShowMobileFilters: (show: boolean) => void;
  setShowKeyboardShortcuts: (show: boolean) => void;
}

export function useShopKeyboardShortcuts({
  showCart,
  showMobileFilters,
  showKeyboardShortcuts,
  setShowCart,
  setShowMobileFilters,
  setShowKeyboardShortcuts
}: UseShopKeyboardShortcutsParams) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in inputs
      if ((e.target as HTMLElement).matches('input, textarea, select')) {
        if (e.key !== '?') return;
      }

      // Ctrl/Cmd + K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
        searchInput?.focus();
      }

      // ?: Show keyboard shortcuts
      if (e.key === '?') {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }

      // Escape: Close modals
      if (e.key === 'Escape') {
        if (showCart) setShowCart(false);
        else if (showMobileFilters) setShowMobileFilters(false);
        else if (showKeyboardShortcuts) setShowKeyboardShortcuts(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    showCart,
    showMobileFilters,
    showKeyboardShortcuts,
    setShowCart,
    setShowMobileFilters,
    setShowKeyboardShortcuts
  ]);
}