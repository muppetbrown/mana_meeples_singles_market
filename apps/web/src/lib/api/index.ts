export { api, API_BASE } from './client';
export { ENDPOINTS, buildQueryString } from './endpoints';

// Unified card query utilities
export {
  buildCardQuery,
  buildCardParams,
  buildStorefrontQuery, // Backwards compatibility alias
  type CardQueryParams,
  type CardAPIParams,
  type StorefrontQueryParams, // Backwards compatibility alias
  type StorefrontAPIParams, // Backwards compatibility alias
  type Game,
  type Set
} from './storefront';