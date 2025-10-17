// apps/web/src/components/cards/types.ts
export type Currency = { symbol: string; rate: number; code: string };
export type CardVariation = {
  key: string; // your variation id/sku key
  price: number;
  stock: number;
};
export type CardData = {
  id: string | number;
  name: string;
  imageUrl?: string;
  variations: Record<string, CardVariation>;
};

export type CardItemProps = {
  card: CardData;
  selectedVariationKey: string;
  selectedVariation: CardVariation | null;
  currency: Currency;
  onVariationChange: (key: string) => void;
  onAddToCart: () => void;
};
