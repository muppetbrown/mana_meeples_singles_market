// apps/web/src/shared/components/ui/EmptyState.tsx
/**
 * Empty State Component
 * Displays appropriate empty states for different contexts
 * 
 * FIXED: Added proper TypeScript type for action parameter
 */
import React from 'react';
import { Package, Search, ShoppingCart, AlertTriangle, FileX, RefreshCw, Filter } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  description?: string;
}

export interface EmptyStateProps {
  type?: 'default' | 'search' | 'cart' | 'error' | 'inventory';
  icon?: LucideIcon;
  title?: string;
  message?: string;
  actions?: EmptyStateAction[];
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const EMPTY_STATE_CONFIG = {
  default: {
    icon: Package,
    title: 'No items found',
    message: 'There are currently no items to display.'
  },
  search: {
    icon: Search,
    title: 'No results found',
    message: 'Try adjusting your search or filter to find what you\'re looking for.'
  },
  cart: {
    icon: ShoppingCart,
    title: 'Your cart is empty',
    message: 'Add some cards to your cart to get started.'
  },
  error: {
    icon: AlertTriangle,
    title: 'Something went wrong',
    message: 'We encountered an error while loading this content.'
  },
  inventory: {
    icon: FileX,
    title: 'No inventory items',
    message: 'Start by adding cards to your inventory.'
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * EmptyState Component
 * Displays a user-friendly empty state with optional actions
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'default',
  icon: CustomIcon,
  title: customTitle,
  message: customMessage,
  actions = [],
  className = ''
}) => {
  const config = EMPTY_STATE_CONFIG[type];
  const IconComponent = CustomIcon || config.icon;
  const title = customTitle || config.title;
  const message = customMessage || config.message;

  return (
    <div 
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      <div className="mb-4 p-4 bg-slate-100 rounded-full">
        <IconComponent 
          className="w-12 h-12 text-slate-400" 
          aria-hidden="true"
        />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-slate-900 mb-2">
        {title}
      </h3>

      {/* Message */}
      <p className="text-slate-600 max-w-md mb-6">
        {message}
      </p>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center">
          {actions.map((action: EmptyStateAction, index: number) => {
            const isPrimary = action.primary !== false && index === 0;
            return (
              <button
                key={index}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`
                  px-6 py-3 rounded-lg font-semibold transition-colors min-h-[44px] focus:ring-4 focus:ring-offset-2 focus:outline-none
                  ${isPrimary
                    ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white focus:ring-blue-500'
                    : 'bg-white hover:bg-slate-50 disabled:bg-slate-100 text-slate-700 border border-slate-300 focus:ring-slate-500'
                  }
                  ${action.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                `}
                aria-describedby={action.description ? `action-${index}-desc` : undefined}
              >
                {action.loading && (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mr-2" />
                )}
                {action.icon && (
                  <action.icon className="w-4 h-4 inline-block mr-2" aria-hidden="true" />
                )}
                {action.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Hidden descriptions for screen readers */}
      {actions.map((action: EmptyStateAction, index: number) => (
        action.description && (
          <span key={`desc-${index}`} id={`action-${index}-desc`} className="sr-only">
            {action.description}
          </span>
        )
      ))}
    </div>
  );
};

// ============================================================================
// SPECIFIC EMPTY STATE COMPONENTS
// ============================================================================

/**
 * SearchEmptyState
 * Empty state specifically for search results
 */
export const SearchEmptyState: React.FC<{
  searchTerm: string;
  onClearSearch: () => void;
  onBrowseCategories?: () => void;
}> = ({ searchTerm, onClearSearch, onBrowseCategories }) => (
  <EmptyState
    type="search"
    title={`No results for "${searchTerm}"`}
    actions={[
      {
        label: 'Clear Search',
        onClick: onClearSearch,
        icon: RefreshCw,
        description: 'Clear current search and show all cards'
      },
      ...(onBrowseCategories ? [{
        label: 'Browse Categories',
        onClick: onBrowseCategories,
        primary: false,
        icon: Filter,
        description: 'Browse cards by category'
      }] : [])
    ]}
  />
);

/**
 * CartEmptyState
 * Empty state for empty shopping cart
 */
export const CartEmptyState: React.FC<{
  onStartShopping: () => void;
}> = ({ onStartShopping }) => (
  <EmptyState
    type="cart"
    actions={[
      {
        label: 'Start Shopping',
        onClick: onStartShopping,
        icon: Package,
        description: 'Browse available cards'
      }
    ]}
  />
);

/**
 * ErrorEmptyState
 * Empty state for error conditions
 */
export const ErrorEmptyState: React.FC<{
  error?: Error | { message?: string };
  onRetry?: () => void;
}> = ({ error, onRetry }) => (
  <EmptyState
    type="error"
    title="Oops! Something went wrong"
    message={error?.message || 'We encountered an unexpected error.'}
    actions={onRetry ? [
      {
        label: 'Try Again',
        onClick: onRetry,
        icon: RefreshCw,
        description: 'Retry loading the content'
      }
    ] : []}
  />
);

/**
 * InventoryEmptyState
 * Empty state for inventory management
 */
export const InventoryEmptyState: React.FC<{
  onAddInventory?: () => void;
  onImportCSV?: () => void;
}> = ({ onAddInventory, onImportCSV }) => {
  const actions: EmptyStateAction[] = [];
  
  if (onAddInventory) {
    actions.push({
      label: 'Add Items',
      onClick: onAddInventory,
      icon: Package,
      description: 'Add items to your inventory'
    });
  }
  
  if (onImportCSV) {
    actions.push({
      label: 'Import CSV',
      onClick: onImportCSV,
      primary: false,
      icon: FileX,
      description: 'Import inventory from CSV file'
    });
  }

  return (
    <EmptyState
      type="inventory"
      actions={actions}
    />
  );
};

export default EmptyState;