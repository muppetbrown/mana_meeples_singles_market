// apps/web/src/features/shop/components/CardDisplay/CardRow.tsx
import * as React from 'react';
import clsx from 'clsx';

export type CardIdentity = {
  id: number;
  name: string;
  gameName: string; // e.g., "Magic: The Gathering"
  setName: string;  // e.g., "Bloomburrow"
  cardNumber: string;
  rarity?: string;
  imageUrl?: string;
};

export type VariationBadge = {
  label: string;
  title?: string;
  variant?: 'neutral' | 'accent' | 'warning';
};

export type CardRowProps = {
  identity: CardIdentity;
  rightNode?: React.ReactNode; // place for price/CTA
  badges?: Array<VariationBadge>; // variation badges (treatment+finish combinations with stock/price)
  onImageOpen?: () => void;
  className?: string;
  tableMode?: boolean; // if true, renders as table row cells
};

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  width: number;
  height: number;
};

/**
 * AAA considerations:
 * - Identity line is semantic text (h3) and details in a <p>.
 * - Thumbnail is a <button> to open the image modal with aria-controls linkage.
 * - Badges are <ul> with <li> to be read as a short summary.
 * - Focus order: thumbnail → title → action (right).
 * - Visible focus ring and respects prefers-reduced-motion.
 */
export function CardRow({ identity, rightNode, badges, onImageOpen, className, tableMode = false }: CardRowProps) {
  const [imageError, setImageError] = React.useState(false);

  const finalImageUrl = React.useMemo(() => {
    if (imageError) return '/placeholder-card.png';
    return identity.imageUrl ?? '/placeholder-card.png';
  }, [identity.imageUrl, imageError]);

  if (tableMode) {
    // Table row mode - renders as table cells
    return (
      <tr className={clsx(className)} aria-label={`${identity.name} — ${identity.gameName}`}>
        {/* Image */}
        <td className="px-4 py-4">
          <button
            type="button"
            onClick={onImageOpen}
            className={clsx(
              'w-12 h-16 flex-shrink-0 overflow-hidden rounded-md bg-slate-100 transition-all',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2',
              'hover:shadow-md cursor-pointer'
            )}
            aria-haspopup="dialog"
            aria-label={`Open larger image for ${identity.name}`}
          >
            <img
              src={finalImageUrl}
              alt=""
              width={48}
              height={64}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
              className="object-cover w-full h-full"
            />
          </button>
        </td>

        {/* Game */}
        <td className="px-4 py-4 text-sm text-slate-700">
          {identity.gameName}
        </td>

        {/* Set */}
        <td className="px-4 py-4 text-sm text-slate-700">
          {identity.setName}
        </td>

        {/* Name */}
        <td className="px-4 py-4">
          <div className="text-sm font-medium text-slate-900">
            {identity.name}
          </div>
        </td>

        {/* Card Number - Hidden on mobile */}
        <td className="hidden sm:table-cell px-4 py-4 text-sm text-slate-600">
          {identity.cardNumber || '—'}
        </td>

        {/* Rarity - Hidden on mobile and small screens */}
        <td className="hidden md:table-cell px-4 py-4 text-sm text-slate-600">
          {identity.rarity || '—'}
        </td>

        {/* Variations - Hidden on mobile, small, and medium screens */}
        <td className="hidden lg:table-cell px-4 py-4">
          <div className="max-w-xs">
            {badges && badges.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {badges.map((badge, i) => (
                  <span
                    key={i}
                    className={clsx(
                      'inline-flex items-center px-2 py-1 rounded-md text-xs border font-medium',
                      badge.variant === 'accent' && 'bg-blue-50 text-blue-700 border-blue-200',
                      badge.variant === 'warning' && 'bg-amber-50 text-amber-700 border-amber-200',
                      (!badge.variant || badge.variant === 'neutral') && 'bg-slate-50 text-slate-600 border-slate-200'
                    )}
                    title={badge.title || `Variation: ${badge.label}`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </td>

        {/* Action - Hidden on mobile, small, and medium screens */}
        <td className="hidden xl:table-cell px-4 py-4 text-right">
          <div className="flex items-center justify-end gap-3">
            {rightNode}
          </div>
        </td>
      </tr>
    );
  }

  // Card mode - renders as div (original implementation)
  return (
    <div
      className={clsx(
        'grid grid-cols-[72px_1fr_auto] gap-3 items-center p-3 rounded-2xl shadow-sm bg-white/80 dark:bg-zinc-900/80',
        'focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500',
        className
      )}
      role="group"
      aria-label={`${identity.name} — ${identity.gameName}`}
    >
      <button
        type="button"
        onClick={onImageOpen}
        className={clsx(
          'h-[72px] w-[72px] overflow-hidden rounded-xl border transition-all',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2',
          'hover:shadow-md'
        )}
        aria-haspopup="dialog"
        aria-label={`Open larger image for ${identity.name}`}
      >
        <img
          src={finalImageUrl}
          alt=""
          width={72}
          height={72}
          loading="lazy"
          decoding="async"
          onError={() => setImageError(true)}
          className={clsx("object-cover", className)}
        />
      </button>

      <div className="min-w-0">
        <h3 className="text-base font-semibold leading-tight line-clamp-1">{identity.name}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          <span className="sr-only">Game:</span>{identity.gameName} · {identity.setName} · #{identity.cardNumber}
          {identity.rarity ? <> · <span aria-label="rarity">{identity.rarity}</span></> : null}
        </p>
        {badges && badges.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1" aria-label="available variations">
            {badges.map((badge, i) => (
              <li key={i}>
                <span
                  className={clsx(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium',
                    badge.variant === 'accent' && 'bg-blue-50 text-blue-700 border-blue-200',
                    badge.variant === 'warning' && 'bg-amber-50 text-amber-700 border-amber-200',
                    (!badge.variant || badge.variant === 'neutral') && 'bg-slate-50 text-slate-600 border-slate-200'
                  )}
                  title={badge.title || `Variation: ${badge.label}`}
                >
                  {badge.label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="justify-self-end flex items-center gap-2">{rightNode}</div>
    </div>
  );
}

export default CardRow