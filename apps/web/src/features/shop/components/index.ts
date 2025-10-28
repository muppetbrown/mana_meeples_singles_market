// apps/web/src/features/shop/components/index.ts

// Public API - Main shop components
export { ShopHeader } from './ShopHeader';
export { ResultsHeader } from './ResultsHeader';
export { RecentlyViewedCards } from './RecentlyViewedCards';

// Shop state & utilities
export { ShopFilters } from './ShopFilters';
export { ShopCart, useShopCartUtils } from './ShopCart';
export { ShopState } from './ShopState';

// Cart components
export { AddToCartModal } from './Cart/AddToCartModal';
export { CartItem } from './Cart/CartItem';
export { CartModal } from './Cart/CartModal';
export { MiniCart } from './Cart/MiniCart';
export { Checkout } from './Cart/Checkout';

// Deprecated default exports - will be removed in future version
/** @deprecated Use named export { ShopHeader } instead */
export { default as ShopHeaderDefault } from './ShopHeader';
/** @deprecated Use named export { ResultsHeader } instead */
export { default as ResultsHeaderDefault } from './ResultsHeader';
/** @deprecated Use named export { RecentlyViewedCards } instead */
export { default as RecentlyViewedCardsDefault } from './RecentlyViewedCards';
/** @deprecated Use named export { Checkout } instead */
export { default as CheckoutDefault } from './Cart/Checkout';