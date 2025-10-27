import { useEffect } from 'react';

interface UseShopKeyboardShortcutsParams {
  showCart: boolean;
  showMobileFilters: boolean;
  showKeyboardShortcuts: boolean;
  setShowCart: (show: boolean) => void;
  setShowMobileFilters: (show: boolean) => void;
  setShowKeyboardShortcuts: (show: boolean) => void;
  // New keyboard navigation params
  viewMode?: 'grid' | 'list';
  setViewMode?: (mode: 'grid' | 'list') => void;
  onClearAllFilters?: () => void;
  onAddFocusedCardToCart?: () => void;
}

export function useShopKeyboardShortcuts({
  showCart,
  showMobileFilters,
  showKeyboardShortcuts,
  setShowCart,
  setShowMobileFilters,
  setShowKeyboardShortcuts,
  viewMode,
  setViewMode,
  onClearAllFilters,
  onAddFocusedCardToCart
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

      // /: Focus search (alternative)
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
        searchInput?.focus();
      }

      // ?: Show keyboard shortcuts
      if (e.key === '?') {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }

      // f: Toggle mobile filters panel
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowMobileFilters(!showMobileFilters);
      }

      // g: Switch between grid and list view
      if (e.key === 'g' && setViewMode && viewMode) {
        e.preventDefault();
        setViewMode(viewMode === 'grid' ? 'list' : 'grid');
      }

      // c: Open shopping cart
      if (e.key === 'c' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowCart(true);
      }

      // r: Reset all filters
      if (e.key === 'r' && onClearAllFilters && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onClearAllFilters();
      }

      // a: Add focused card to cart
      if (e.key === 'a' && onAddFocusedCardToCart && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onAddFocusedCardToCart();
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
    setShowKeyboardShortcuts,
    viewMode,
    setViewMode,
    onClearAllFilters,
    onAddFocusedCardToCart
  ]);
}