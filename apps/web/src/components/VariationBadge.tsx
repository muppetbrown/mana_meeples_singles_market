// apps/web/src/components/VariationBadge.tsx
type Props = { finish: string; treatment?: string; promoType?: string };
export default function VariationBadge({ finish, treatment, promoType }: Props) {
return (
<span
role="img"
aria-label={`Variation ${finish}${treatment ? `, ${treatment}` : ''}${promoType ? `, ${promoType}` : ''}`}
className="inline-flex items-center gap-1 rounded-2xl px-2 py-0.5 text-sm font-medium shadow-sm border"
>
<span className="uppercase">{finish}</span>
{treatment && <span className="opacity-70">{treatment}</span>}
{promoType && <span className="opacity-70">{promoType}</span>}
</span>
);
}