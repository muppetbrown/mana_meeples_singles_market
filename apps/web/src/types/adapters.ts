// apps/web/src/types/adapters.ts
import type { ApiCard, ApiCardVariation } from './api';
import type { UiCard, UiCardVariation } from './ui';

function toUiVariation(v: ApiCardVariation): [string, UiCardVariation] {
  const key = v.variation_label || `${v.card_id}-${v.treatment}-${v.finish}`;
  return [key, {
    key,
    stock: v.stock ?? v.inventory_count ?? 0,
    label: v.variation_label,
    finish: v.finish,
    treatment: v.treatment,
  }];
}

export function toUiCard(c: ApiCard): UiCard {
  const entries = (c.variations ?? []).map(toUiVariation);
  return {
    id: c.id,
    name: c.name,
    imageUrl: c.image_url,
    setName: c.set_name,
    rarity: c.rarity,
    totalStock: c.total_stock,
    variationCount: c.variation_count,
    hasInventory: c.has_inventory,
    variations: Object.fromEntries(entries),
  };
}
