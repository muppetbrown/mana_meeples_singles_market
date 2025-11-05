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
export { CartItemDisplay } from './Cart/CartItem';
export { CartModal } from './Cart/CartModal';
export { MiniCart } from './Cart/MiniCart';
export { default as Checkout } from './Cart/Checkout';