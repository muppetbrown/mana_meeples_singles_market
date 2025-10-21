// 1. types/models/card.ts - All card-related domain models
export interface Card {
  id: number;
  name: string;
  card_number: string;
  set_name: string;
  game_name: string;
  rarity?: string;
  image_url?: string;
  total_stock: number;
  variation_count: number;
  variations?: CardVariation[];
  has_inventory?: boolean;
}

export interface CardVariation {
  inventory_id: number;
  quality: string;
  foil_type: string;
  language: string;
  price: number | null;
  stock: number | null;
  variation_key: string;
}

export interface StorefrontCard extends Card {
  variations: CardVariation[];
}