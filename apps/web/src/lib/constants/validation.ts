// Validation constants and schemas
// Re-exports validation-related constants from main constants file

export { VALIDATION_CONFIG } from './index';

// Additional validation schemas and utilities can be added here
export const FORM_VALIDATION = {
  // Customer form validation
  CUSTOMER: {
    FIRST_NAME: {
      MIN_LENGTH: 1,
      MAX_LENGTH: 50,
      PATTERN: /^[a-zA-Z\s'-]+$/,
    },
    LAST_NAME: {
      MIN_LENGTH: 1,
      MAX_LENGTH: 50,
      PATTERN: /^[a-zA-Z\s'-]+$/,
    },
    EMAIL: {
      MAX_LENGTH: 254,
      PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    PHONE: {
      MIN_LENGTH: 7,
      MAX_LENGTH: 20,
      PATTERN: /^[+]?[\d\s\-()]+$/,
    },
  },

  // Address validation
  ADDRESS: {
    ADDRESS_LINE: {
      MIN_LENGTH: 1,
      MAX_LENGTH: 200,
    },
    CITY: {
      MIN_LENGTH: 1,
      MAX_LENGTH: 100,
    },
    POSTAL_CODE: {
      MIN_LENGTH: 3,
      MAX_LENGTH: 10,
      PATTERN: /^[A-Z0-9\s-]+$/i,
    },
  },

  // Order validation
  ORDER: {
    QUANTITY: {
      MIN: 1,
      MAX: 50,
    },
    NOTES: {
      MAX_LENGTH: 500,
    },
  },

  // Admin validation
  ADMIN: {
    BULK_IMPORT: {
      MAX_ROWS: 1000,
      REQUIRED_FIELDS: ['name', 'set_name', 'quality', 'price', 'stock_quantity'],
      VALID_QUALITIES: ['NM', 'LP', 'MP', 'HP', 'DMG'],
      VALID_FOIL_TYPES: ['Regular', 'Foil', 'Etched', 'Showcase'],
    },
  },
};

export default {
  VALIDATION_CONFIG,
  FORM_VALIDATION,
};