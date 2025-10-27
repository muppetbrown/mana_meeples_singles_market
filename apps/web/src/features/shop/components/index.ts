// apps\web\src\features\shop\index.ts

// Components
export { default as ShopHeader } from './ShopHeader';
export { default as ResultsHeader } from './ResultsHeader';
export { default as RecentlyViewedCards } from './RecentlyViewedCards';

// New extracted components
export { ShopFilters } from './ShopFilters';
export { ShopCart, useShopCartUtils } from './ShopCart';
export { ShopState } from './ShopState';

// Cart
export * from './Cart/AddToCartModal';
export * from './Cart/CartItem';
export * from './Cart/CartModal';
export * from './Cart/MiniCart';
export { default as Checkout } from './Cart/Checkout';