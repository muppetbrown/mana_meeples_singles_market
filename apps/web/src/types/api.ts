// apps/web/src/types/api.ts
// API models (mirror backend shapes)

export interface ApiCardVariation {
  card_id: number;
  variation_label: string;
  treatment: string;
  finish: string;
  inventory_count: number;
  stock: number;
}

export interface ApiCard {
  id: number;
  name: string;
  card_number: string;
  set_name: string;
  rarity?: string;
  image_url?: string;
  variation_count: number;
  total_stock: number;
  has_inventory: boolean;
  variations: ApiCardVariation[];
}

export interface ApiGame {
  id: number;
  name: string;
  code?: string;
  card_count?: number;
}

export interface ApiSet {
  id: number;
  name: string;
  card_count?: number;
}

export interface ApiInventoryItem {
  game_name: string;
  quality: string;
  stock_quantity: number;
  price: number;
  price_source?: string | null;
}

export interface StorefrontVariation {
  inventory_id: number;
  quality: string;
  foil_type: string;   // 'Regular' defaulted
  language: string;    // 'English' defaulted
  price: number | null;
  stock: number | null;
  variation_key: string; // "<quality>-<foil>-<language>"
}

export interface StorefrontCard {
  id: number;
  name: string;
  card_number: string;
  set_name: string;
  rarity?: string;
  image_url?: string;
  game_name: string;
  total_stock: number;
  variation_count: number;
  variations: StorefrontVariation[];
}
