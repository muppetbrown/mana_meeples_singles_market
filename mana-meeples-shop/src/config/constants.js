/**
 * Application Constants
 * Centralized location for all magic numbers, configuration values, and constants
 */

// API Configuration
export const API_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Filter and Search Configuration
export const FILTER_CONFIG = {
  DEBOUNCE_DELAY: 300, // 300ms debounce for better UX (was 1000ms)
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes cache
  MIN_SEARCH_LENGTH: 2, // Minimum characters to trigger search
  MAX_SUGGESTIONS: 10, // Maximum autocomplete suggestions
};

// Virtual Scrolling Configuration
export const VIRTUAL_SCROLL_CONFIG = {
  CARD_HEIGHT: 420, // Height of each card including margins
  CONTAINER_HEIGHT: 800, // Default container height
  OVERSCAN_COUNT: 2, // Extra items to render outside viewport
  BATCH_SIZE: 50, // Items to load per batch
  INITIAL_BATCH_SIZE: 100, // Items to load initially
};

// Layout Breakpoints (matching Tailwind CSS)
export const BREAKPOINTS = {
  SM: 640, // Small screens
  MD: 768, // Medium screens
  LG: 1024, // Large screens
  XL: 1280, // Extra large screens
  '2XL': 1536, // 2X large screens
};

// Grid Configuration
export const GRID_CONFIG = {
  COLUMNS: {
    MOBILE: 1,
    TABLET: 2,
    DESKTOP: 3,
    WIDE: 4,
  },
  GAP: 16, // Grid gap in pixels
  PADDING: 16, // Container padding
};

// Touch and Accessibility
export const ACCESSIBILITY_CONFIG = {
  MIN_TOUCH_TARGET: 44, // Minimum touch target size (iOS standard)
  MIN_TOUCH_TARGET_MATERIAL: 48, // Material Design standard
  FOCUS_RING_WIDTH: 2, // Focus ring width in pixels
  SCREEN_READER_DELAY: 100, // Delay for screen reader announcements
};

// Animation and Transitions
export const ANIMATION_CONFIG = {
  DURATION: {
    FAST: 150, // Fast transitions
    NORMAL: 300, // Normal transitions
    SLOW: 500, // Slow transitions
  },
  EASING: {
    EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
    EASE_OUT: 'cubic-bezier(0, 0, 0.2, 1)',
    EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// Cart and Order Configuration
export const CART_CONFIG = {
  MAX_QUANTITY_PER_ITEM: 10, // Maximum quantity per item
  NOTIFICATION_DURATION: 5000, // Cart notification duration (screen reader friendly)
  ERROR_NOTIFICATION_DURATION: 8000, // Error notifications stay longer
  STORAGE_KEY: 'tcg_cart', // localStorage key for cart data
};

// Image Configuration
export const IMAGE_CONFIG = {
  PLACEHOLDER_WIDTH: 10,
  PLACEHOLDER_HEIGHT: 10,
  DEFAULT_ASPECT_RATIO: '5/7', // Default card aspect ratio
  LAZY_LOAD_MARGIN: '50px', // Start loading before entering viewport
  QUALITY: 85, // Default image quality
  BREAKPOINTS: [400, 600, 800, 1200], // Responsive image breakpoints
};

// Currency Configuration
export const CURRENCY_CONFIG = {
  DEFAULT_CURRENCY: 'NZD',
  DEFAULT_SYMBOL: 'NZ$',
  DECIMAL_PLACES: 2,
  UPDATE_INTERVAL: 60 * 60 * 1000, // 1 hour for exchange rates
  SUPPORTED_CURRENCIES: [
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', rate: 1.0 },
    { code: 'USD', symbol: '$', name: 'US Dollar', rate: 0.61 },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rate: 0.92 },
    { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.55 },
    { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.48 },
  ],
};

// Form Validation
export const VALIDATION_CONFIG = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[+]?[1-9][\d]{0,15}$/,
  POSTAL_CODE_NZ_REGEX: /^\d{4}$/,
  MIN_PASSWORD_LENGTH: 8,
  MAX_INPUT_LENGTH: 255,
};

// Error Handling
export const ERROR_CONFIG = {
  RATE_LIMIT_STATUS: 429,
  AUTH_ERROR_STATUSES: [401, 403],
  CLIENT_ERROR_RANGE: [400, 499],
  SERVER_ERROR_RANGE: [500, 599],
  NETWORK_ERROR_CODES: ['NETWORK_ERROR', 'TIMEOUT', 'CONNECTION_REFUSED'],
};

// Feature Flags
export const FEATURES = {
  VIRTUAL_SCROLLING: true,
  PROGRESSIVE_LOADING: true,
  AUTO_CURRENCY_UPDATE: false, // Disabled by default for privacy
  KEYBOARD_SHORTCUTS: true,
  ADVANCED_FILTERS: true,
  BULK_OPERATIONS: true,
};

// UI Text and Labels
export const UI_TEXT = {
  LOADING: 'Loading...',
  ERROR_GENERIC: 'Something went wrong. Please try again.',
  ERROR_NETWORK: 'Please check your internet connection.',
  NO_RESULTS: 'No cards found matching your criteria.',
  EMPTY_CART: 'Your cart is empty.',
  ADD_TO_CART: 'Add to Cart',
  REMOVE_FROM_CART: 'Remove from Cart',
  CONTINUE_SHOPPING: 'Continue Shopping',
  CHECKOUT: 'Checkout',
  SEARCH_PLACEHOLDER: 'Search for cards...',
  FILTER_ALL: 'All',
};

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  SEARCH: '/',
  TOGGLE_CART: 'c',
  TOGGLE_VIEW: 'v',
  CLEAR_FILTERS: 'x',
  FOCUS_FIRST_CARD: 'ArrowDown',
  FOCUS_LAST_CARD: 'ArrowUp',
  ESCAPE: 'Escape',
};

// Performance Monitoring
export const PERFORMANCE_CONFIG = {
  SLOW_RENDER_THRESHOLD: 16, // 16ms for 60fps
  MEMORY_WARNING_THRESHOLD: 100 * 1024 * 1024, // 100MB
  BUNDLE_SIZE_WARNING: 500 * 1024, // 500KB
};

// Export grouped constants for easier imports
export const CONSTANTS = {
  API_CONFIG,
  FILTER_CONFIG,
  VIRTUAL_SCROLL_CONFIG,
  BREAKPOINTS,
  GRID_CONFIG,
  ACCESSIBILITY_CONFIG,
  ANIMATION_CONFIG,
  CART_CONFIG,
  IMAGE_CONFIG,
  CURRENCY_CONFIG,
  VALIDATION_CONFIG,
  ERROR_CONFIG,
  FEATURES,
  UI_TEXT,
  KEYBOARD_SHORTCUTS,
  PERFORMANCE_CONFIG,
};

export default CONSTANTS;