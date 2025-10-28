// 7. types/ui/common.ts - Common UI types
export interface Currency {
  code: string;
  symbol: string;
  rate: number;
  label: string;
}

export type ViewMode = 'grid' | 'list';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}