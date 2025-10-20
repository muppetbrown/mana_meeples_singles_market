// types/ui.ts
// UI view models (what components actually render)

export type Currency = { symbol: string; rate: number; code: string };

export type UiCardVariation = {
  key: string;        // stable key (sku/variation_label or composed)
  price?: number;     // optional in UI if you hydrate later
  stock: number;
  label?: string;     // display label
  finish?: string;
  treatment?: string;
};

export type UiCard = {
  id: number | string;
  name: string;
  imageUrl?: string;
  setName?: string;
  rarity?: string;
  totalStock?: number;
  variationCount?: number;
  hasInventory?: boolean;
  variations: Record<string, UiCardVariation>;
};

// Props used by card components
export type CardItemProps = {
  card: UiCard;
  selectedVariationKey: string;
  selectedVariation: UiCardVariation | null;
  currency: Currency;
  onVariationChange: (key: string) => void;
  onAddToCart: () => void;
};
