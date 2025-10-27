// ============================================================================
// services/error/types.ts - Error type definitions
// ============================================================================

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  API = 'API',
  UNKNOWN = 'UNKNOWN'
}

export interface FormattedError {
  type: ErrorType;
  title: string;
  message: string;
  action: string;
  originalError: unknown;
  timestamp: string;
}

export interface ErrorTemplate {
  title: string;
  message: string;
  action: string;
}