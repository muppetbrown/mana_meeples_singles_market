import React from 'react';
import { Package, Search, Filter, ShoppingCart, RefreshCw, AlertCircle, Frown } from 'lucide-react';

/**
 * Comprehensive Empty State Component
 * Provides helpful empty states with images, suggestions, and clear actions
 */
const EmptyState = ({
  type = 'generic',
  title,
  message,
  suggestions = [],
  actions = [],
  className = '',
  showImage = true,
  imageClassName = ''
}) => {
  // Predefined empty state configurations
  const emptyStateConfigs = {
    search: {
      icon: Search,
      title: 'No cards found',
      message: 'We couldn\'t find any cards matching your search criteria.',
      suggestions: [
        'Try different search terms',
        'Check your spelling',
        'Use broader search terms',
        'Browse by category instead'
      ],
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50'
    },
    filter: {
      icon: Filter,
      title: 'No matching cards',
      message: 'No cards match your current filters.',
      suggestions: [
        'Try removing some filters',
        'Expand your quality criteria',
        'Try a different set or game',
        'Clear all filters and start fresh'
      ],
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-50'
    },
    cart: {
      icon: ShoppingCart,
      title: 'Your cart is empty',
      message: 'Add some cards to your cart to get started.',
      suggestions: [
        'Browse our featured cards',
        'Search for specific cards',
        'Check out popular sets',
        'View cards on sale'
      ],
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50'
    },
    inventory: {
      icon: Package,
      title: 'No inventory available',
      message: 'There are currently no cards in stock.',
      suggestions: [
        'Check back later for restocks',
        'Contact us about specific cards',
        'Browse other sets or games',
        'Sign up for restock notifications'
      ],
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-50'
    },
    error: {
      icon: AlertCircle,
      title: 'Something went wrong',
      message: 'We encountered an error loading the content.',
      suggestions: [
        'Try refreshing the page',
        'Check your internet connection',
        'Clear your browser cache',
        'Contact support if problem persists'
      ],
      iconColor: 'text-red-500',
      bgColor: 'bg-red-50'
    },
    network: {
      icon: RefreshCw,
      title: 'Connection error',
      message: 'Unable to connect to our servers.',
      suggestions: [
        'Check your internet connection',
        'Try again in a moment',
        'Switch to a different network',
        'Contact your network administrator'
      ],
      iconColor: 'text-gray-500',
      bgColor: 'bg-gray-50'
    },
    generic: {
      icon: Frown,
      title: 'Nothing here yet',
      message: 'There\'s no content to display right now.',
      suggestions: [
        'Try a different action',
        'Check back later',
        'Browse other sections',
        'Contact support if needed'
      ],
      iconColor: 'text-slate-500',
      bgColor: 'bg-slate-50'
    }
  };

  const config = emptyStateConfigs[type] || emptyStateConfigs.generic;
  const Icon = config.icon;

  // Use provided props or fall back to config defaults
  const finalTitle = title || config.title;
  const finalMessage = message || config.message;
  const finalSuggestions = suggestions.length > 0 ? suggestions : config.suggestions;

  return (
    <div className={`text-center py-12 px-6 ${className}`} role="region" aria-label="Empty state">
      {/* Icon/Illustration */}
      {showImage && (
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${config.bgColor} mb-6 ${imageClassName}`}>
          <Icon
            className={`w-10 h-10 ${config.iconColor}`}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Title */}
      <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-3">
        {finalTitle}
      </h2>

      {/* Description */}
      <p className="text-slate-600 text-base lg:text-lg mb-6 max-w-md mx-auto leading-relaxed">
        {finalMessage}
      </p>

      {/* Suggestions */}
      {finalSuggestions.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
            Try this instead:
          </h3>
          <ul className="space-y-2 text-sm text-slate-600 max-w-sm mx-auto">
            {finalSuggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0 mt-2" aria-hidden="true"></span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          {actions.map((action, index) => {
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
                aria-describedby={`action-${index}-desc`}
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

      {/* Hidden description for screen readers */}
      {actions.map((action, index) => (
        action.description && (
          <span key={index} id={`action-${index}-desc`} className="sr-only">
            {action.description}
          </span>
        )
      ))}
    </div>
  );
};

/**
 * Specific empty state components for common use cases
 */
export const SearchEmptyState = ({ searchTerm, onClearSearch, onBrowseCategories }) => (
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
      {
        label: 'Browse Categories',
        onClick: onBrowseCategories,
        primary: false,
        icon: Filter,
        description: 'Browse cards by category'
      }
    ]}
  />
);

export const CartEmptyState = ({ onStartShopping }) => (
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

export const ErrorEmptyState = ({ error, onRetry }) => (
  <EmptyState
    type="error"
    title="Oops! Something went wrong"
    message={error?.message || 'We encountered an unexpected error.'}
    actions={[
      {
        label: 'Try Again',
        onClick: onRetry,
        icon: RefreshCw,
        description: 'Retry the failed operation'
      }
    ]}
  />
);

export const LoadingEmptyState = () => (
  <div className="text-center py-12 px-6">
    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 mb-6">
      <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
    <h2 className="text-xl font-bold text-slate-900 mb-3">
      Loading...
    </h2>
    <p className="text-slate-600">
      Please wait while we fetch the latest data.
    </p>
  </div>
);

export default EmptyState;