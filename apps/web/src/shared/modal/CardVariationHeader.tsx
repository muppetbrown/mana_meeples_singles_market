// apps/web/src/shared/modal/CardVariationHeader.tsx
/**
 * CardVariationHeader - Shared modal header component
 *
 * Used in both AddToCartModal and AddToInventoryModal to display:
 * - Card image with contextual icon overlay
 * - Card name and metadata (game, set)
 * - Close button
 */

import * as React from 'react';
import { X, ShoppingCart, Package, Sparkles } from 'lucide-react';
import OptimizedImage from '@/shared/media/OptimizedImage';

export type CardVariationHeaderProps = {
  card: {
    name: string;
    image_url?: string;
    game_name?: string;
    set_name?: string;
    treatment?: string;
    finish?: string;
  };
  title: string;
  titleId: string;
  onClose: () => void;
  iconType?: 'cart' | 'inventory' | 'special';
};

export function CardVariationHeader({
  card,
  title,
  titleId,
  onClose,
  iconType = 'cart',
}: CardVariationHeaderProps) {
  // Determine if card is special/premium based on treatment or finish
  const isSpecialCard = card.treatment && card.treatment !== 'STANDARD' && card.treatment !== 'standard';
  const isFoilCard = card.finish &&
    card.finish.toLowerCase() !== 'nonfoil' &&
    (card.finish.toLowerCase().includes('foil') || card.finish.toLowerCase().includes('etched'));

  const shouldShowSpecialIcon = iconType === 'special' || isSpecialCard || isFoilCard;

  // Icon selection based on type
  const getIcon = () => {
    if (shouldShowSpecialIcon) {
      return <Sparkles className="w-4 h-4 text-amber-600" />;
    }
    if (iconType === 'inventory') {
      return <Package className="w-4 h-4 text-blue-600" />;
    }
    return <ShoppingCart className="w-4 h-4 text-white" />;
  };

  const getIconBackground = () => {
    if (shouldShowSpecialIcon) {
      return 'bg-gradient-to-br from-amber-100 to-yellow-100';
    }
    if (iconType === 'inventory') {
      return 'bg-blue-100';
    }
    return 'bg-gradient-to-br from-mm-gold to-mm-teal';
  };

  return (
    <div className="flex items-start justify-between p-6 border-b border-slate-200 gap-4">
      {/* Left: Card Image */}
      <div className="flex-shrink-0">
        <div className="relative w-24 h-32 rounded-lg overflow-hidden border-2 border-slate-200 shadow-md">
          <OptimizedImage
            src={card.image_url || '/images/card-back-placeholder.svg'}
            alt={card.name}
            width={96}
            height={128}
            className="w-full h-full object-cover"
            placeholder="blur"
            priority={true}
          />
          {/* Icon overlay */}
          <div className={`absolute top-1 right-1 p-1.5 rounded-md ${getIconBackground()}`}>
            {getIcon()}
          </div>
        </div>
      </div>

      {/* Center: Card Info */}
      <div className="flex-1 min-w-0">
        <h2 id={titleId} className="text-xl font-bold text-slate-900">
          {title}
        </h2>
        <div className="mt-2 space-y-1">
          <p className="text-base font-semibold text-slate-800">
            {card.name}
          </p>
          {card.game_name && (
            <p className="text-sm text-slate-600">
              <span className="font-medium">Game:</span> {card.game_name}
            </p>
          )}
          {card.set_name && (
            <p className="text-sm text-slate-600">
              <span className="font-medium">Set:</span> {card.set_name}
            </p>
          )}
        </div>
      </div>

      {/* Right: Close Button */}
      <button
        onClick={onClose}
        className="flex-shrink-0 p-2 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Close modal"
      >
        <X className="w-5 h-5 text-slate-600" />
      </button>
    </div>
  );
}
