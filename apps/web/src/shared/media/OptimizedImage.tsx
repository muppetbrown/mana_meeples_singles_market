// apps/web/src/components/OptimizedImage.tsx
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Optimized Image Component
 * - Lazy loading with Intersection Observer
 * - Loading and error states
 * - Blur placeholder
 * - Improved performance
 */

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  placeholder?: 'blur' | 'empty';
  priority?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  onLoad,
  onError,
}) => {
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading (non-priority images)
  useEffect(() => {
    if (!containerRef.current || priority) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setCurrentSrc(src);
          setLoadState('loading');
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.01
      }
    );

    observerRef.current.observe(containerRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src, priority]);

  // Load immediately for priority images
  useEffect(() => {
    if (priority) {
      setCurrentSrc(src);
      setLoadState('loading');
    }
  }, [src, priority]);

  // Handle image load success
  const handleLoad = useCallback(() => {
    setLoadState('loaded');
    onLoad?.();
  }, [onLoad]);

  // Handle image load error - try fallback if available
  const handleError = useCallback(() => {
    // If we haven't tried the fallback yet and it's available, try it
    if (currentSrc !== '/images/card-back-placeholder.svg' && src !== '/images/card-back-placeholder.svg') {
      setCurrentSrc('/images/card-back-placeholder.svg');
      setLoadState('loading');
    } else {
      setLoadState('error');
      onError?.(new Error(`Failed to load image: ${src}`));
    }
  }, [src, currentSrc, onError]);

  // Blur placeholder SVG
  const blurPlaceholder = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='560'%3E%3Crect fill='%23f1f5f9' width='400' height='560'/%3E%3C/svg%3E`;

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      {/* Blur Placeholder - shown while loading */}
      {(loadState === 'idle' || loadState === 'loading') && (
        <img
          src={blurPlaceholder}
          alt=""
          className="absolute inset-0 w-full h-full object-contain blur-sm"
          aria-hidden="true"
        />
      )}

      {/* Main Image */}
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loadState === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          width={width}
          height={height}
        />
      )}

      {/* Loading Spinner - only show if taking longer than 500ms */}
      {loadState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Error State - DO NOT show "Failed to load" until actually failed */}
      {loadState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4">
          <svg
            className="w-12 h-12 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-xs text-center">Image unavailable</span>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;