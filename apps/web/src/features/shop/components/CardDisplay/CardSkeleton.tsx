// apps/web/src/components/skeletons/CardSkeleton.tsx

/**
 * Card Skeleton Component for loading states
 * Provides a consistent loading placeholder that matches the card layout
 */
const CardSkeleton = () => (
  <div className="card-mm flex flex-row lg:flex-col h-full animate-pulse">
    {/* Image Skeleton */}
    <div className="relative flex-shrink-0 w-28 sm:w-36 lg:w-full">
      <div className="w-full h-32 sm:h-44 lg:h-64 bg-mm-warmAccent"></div>
    </div>

    {/* Content Skeleton */}
    <div className="p-4 sm:p-5 lg:p-5 flex flex-col gap-3 lg:gap-3 flex-grow min-w-0">
      {/* Title Skeleton */}
      <div className="space-y-2">
        <div className="h-4 lg:h-5 bg-mm-warmAccent rounded w-3/4"></div>
        <div className="h-3 lg:h-4 bg-mm-warmAccent rounded w-1/2"></div>
      </div>

      {/* Dropdown Skeleton */}
      <div className="h-11 bg-mm-warmAccent rounded-lg"></div>

      {/* Price Skeleton */}
      <div className="h-6 bg-mm-warmAccent rounded w-20"></div>

      {/* Button Skeleton */}
      <div className="h-11 bg-mm-warmAccent rounded-lg"></div>
    </div>
  </div>
);

export default CardSkeleton;