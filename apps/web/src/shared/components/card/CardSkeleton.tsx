// apps/web/src/components/skeletons/CardSkeleton.tsx
import React from 'react';

/**
 * Card Skeleton Component for loading states
 * Provides a consistent loading placeholder that matches the card layout
 */

interface CardSkeletonProps {
  viewMode?: 'grid' | 'list';
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({ viewMode = 'grid' }) => {
  if (viewMode === 'list') {
    return (
      <div className="flex gap-4 p-4 bg-white rounded-lg border border-gray-200 animate-pulse">
        {/* Image skeleton */}
        <div className="w-24 h-32 bg-gray-200 rounded flex-shrink-0"></div>
        
        {/* Content skeleton */}
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className="card-mm flex flex-col h-full animate-pulse">
      {/* Image Skeleton */}
      <div className="relative w-full">
        <div className="aspect-[5/7] bg-mm-warmAccent rounded-t-2xl"></div>
      </div>

      {/* Content Skeleton */}
      <div className="p-4 sm:p-5 flex flex-col gap-3 flex-grow">
        {/* Title Skeleton */}
        <div className="space-y-2">
          <div className="h-5 bg-mm-warmAccent rounded w-3/4"></div>
          <div className="h-4 bg-mm-warmAccent rounded w-1/2"></div>
        </div>

        {/* Dropdown Skeleton */}
        <div className="h-11 bg-mm-warmAccent rounded-lg"></div>

        {/* Price Skeleton */}
        <div className="h-6 bg-mm-warmAccent rounded w-20"></div>

        {/* Button Skeleton */}
        <div className="h-11 bg-mm-warmAccent rounded-lg mt-auto"></div>
      </div>
    </div>
  );
};

export default CardSkeleton;