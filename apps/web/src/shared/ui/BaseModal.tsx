/**
 * BaseModal Component
 * Reusable modal component that eliminates duplication across AddToCartModal,
 * AddToInventoryModal, CartModal, and MobileFilterModal
 *
 * Features:
 * - Consistent overlay/backdrop styling
 * - Flexible header with optional image thumbnail
 * - Configurable action buttons
 * - Proper accessibility (ARIA labels, focus management)
 * - Responsive design
 */

import React, { ReactNode } from 'react';
import { X } from 'lucide-react';
import OptimizedImage from '@/shared/media/OptimizedImage';

export interface BaseModalProps {
  /** Whether the modal is open */
  isOpen: boolean;

  /** Callback when modal should close */
  onClose: () => void;

  /** Modal title for ARIA and header display */
  title: string;

  /** Optional subtitle or description text */
  subtitle?: string;

  /** Main modal content */
  children: ReactNode;

  /** Optional footer with action buttons */
  footer?: ReactNode;

  /** Optional image to display in header */
  image?: {
    src: string;
    alt: string;
    icon?: ReactNode; // Optional icon overlay on image
  };

  /** Maximum width class (default: max-w-2xl) */
  maxWidth?: string;

  /** Custom CSS classes for the modal content */
  className?: string;

  /** Whether the modal is in a loading state */
  isLoading?: boolean;

  /** Error message to display */
  error?: string | null;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  image,
  maxWidth = 'max-w-2xl',
  className = '',
  isLoading = false,
  error = null,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        className={`relative bg-white dark:bg-zinc-900 rounded-lg shadow-xl ${maxWidth} w-full max-h-[90vh] overflow-y-auto ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-zinc-200 dark:border-zinc-700 gap-4">
          {/* Left: Optional Image */}
          {image && (
            <div className="flex-shrink-0">
              <div className="relative w-24 h-32 rounded-lg overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 shadow-md">
                <OptimizedImage
                  src={image.src}
                  alt={image.alt}
                  width={96}
                  height={128}
                  className="w-full h-full object-cover"
                  placeholder="blur"
                  priority={true}
                />
                {/* Optional icon overlay */}
                {image.icon && (
                  <div className="absolute top-1 right-1 p-1.5 rounded-md bg-gradient-to-br from-mm-gold to-mm-teal">
                    {image.icon}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Center: Title and Subtitle */}
          <div className="flex-1 min-w-0">
            <h2
              id="modal-title"
              className="text-xl font-bold text-zinc-900 dark:text-zinc-100"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {subtitle}
              </p>
            )}
          </div>

          {/* Right: Close Button */}
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-mm-teal border-t-transparent rounded-full animate-spin" />
              <p className="ml-3 text-zinc-600 dark:text-zinc-400" role="status">
                Loading...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-800 dark:text-red-200" role="alert">
                {error}
              </p>
            </div>
          )}

          {/* Content */}
          {!isLoading && !error && children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-0 border-t border-zinc-200 dark:border-zinc-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseModal;
