import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Optimized Image Component with LQIP (Low Quality Image Placeholder) and blur-up technique
 * Implements progressive image loading for better perceived performance
 */
const OptimizedImage = ({
  src,
  alt,
  className = '',
  width,
  height,
  sizes,
  priority = false,
  placeholder = 'blur', // 'blur' | 'empty' | 'custom'
  blurDataURL,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState('');
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Generate a simple blur placeholder if none provided
  const getBlurDataURL = useCallback((w = 10, h = 10) => {
    if (blurDataURL) return blurDataURL;

    // Simple solid color blur placeholder
    return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"%3E%3Crect fill="%23f1f5f9" width="${w}" height="${h}"/%3E%3C/svg%3E`;
  }, [blurDataURL]);

  // Generate responsive srcset if base URL is provided
  const generateSrcSet = useCallback((baseSrc) => {
    if (!baseSrc) return '';

    // This would typically be handled by a CDN like Cloudinary, Imgix, or custom image service
    // For now, return the original src as fallback
    const breakpoints = [400, 600, 800, 1200];
    return breakpoints.map(w => `${baseSrc}?w=${w} ${w}w`).join(', ');
  }, []);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!imgRef.current || priority) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setCurrentSrc(src);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before the image enters viewport
        threshold: 0.1
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src, priority]);

  // Load immediately for priority images
  useEffect(() => {
    if (priority) {
      setCurrentSrc(src);
    }
  }, [src, priority]);

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  // Handle image error with fallback
  const handleError = useCallback((e) => {
    setIsError(true);
    setIsLoading(false);

    // Set fallback image
    const fallbackSrc = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="${width || 250}" height="${height || 350}"%3E%3Crect fill="%231e293b" width="100%25" height="100%25"/%3E%3Ctext fill="white" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E`;
    e.target.src = fallbackSrc;

    onError?.(e);
  }, [width, height, onError]);

  // Determine aspect ratio for container
  const aspectRatio = width && height ? `${width}/${height}` : '5/7'; // Default card aspect ratio

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        aspectRatio: aspectRatio,
        backgroundColor: '#f1f5f9' // Slate-100 as fallback
      }}
    >
      {/* Blur placeholder */}
      {isLoading && placeholder === 'blur' && (
        <img
          src={getBlurDataURL(width, height)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110 transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={currentSrc}
        srcSet={currentSrc ? generateSrcSet(currentSrc) : undefined}
        sizes={sizes || '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw'}
        alt={alt}
        width={width}
        height={height}
        onLoad={handleLoad}
        onError={handleError}
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } hover:scale-105 motion-reduce:hover:scale-100 motion-reduce:transition-none`}
        loading={priority ? 'eager' : 'lazy'}
        {...props}
      />

      {/* Fade-in animation overlay */}
      {!isLoading && (
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-transparent opacity-0 hover:opacity-5 transition-opacity duration-300 motion-reduce:opacity-0 pointer-events-none" />
      )}

      {/* Error state */}
      {isError && (
        <div className="absolute bottom-2 left-2 right-2 text-xs text-white bg-red-600/80 rounded px-2 py-1">
          Failed to load image
        </div>
      )}
    </div>
  );
};

/**
 * Hook for generating responsive image URLs
 * Useful for integration with CDN services
 */
export const useResponsiveImage = (baseSrc, options = {}) => {
  const { width, height, quality = 85, format = 'auto' } = options;

  return useMemo(() => {
    if (!baseSrc) return { src: '', srcSet: '' };

    // This would integrate with your CDN service (Cloudinary, Imgix, etc.)
    // For now, return original URL
    const src = baseSrc;
    const srcSet = [400, 600, 800, 1200]
      .map(w => `${baseSrc}?w=${w}&q=${quality}&f=${format} ${w}w`)
      .join(', ');

    return { src, srcSet };
  }, [baseSrc, width, height, quality, format]);
};

/**
 * WebP detection utility
 */
export const supportsWebP = () => {
  if (typeof window === 'undefined') return false;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  return canvas.toDataURL('image/webp').indexOf('webp') > -1;
};

export default OptimizedImage;