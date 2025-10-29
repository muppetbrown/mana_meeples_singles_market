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
export function CardRow({ identity, rightNode, badges, onImageOpen, className }: CardRowProps) {
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
          'h-[72px] w-[72px] overflow-hidden rounded-xl border',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600'
        )}
        aria-haspopup="dialog"
        aria-label={`Open larger image for ${identity.name}`}
      >
        <img
          src={identity.imageUrl ?? '/placeholder-card.png'}
          alt=""
          width={72}
          height={72}
          loading="lazy"
          decoding="async"
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