// 6. types/ui/cart.ts - UI-specific cart types
export interface CartItem {
  card_id: number;
  inventory_id: number;
  card_name: string;
  variation_key: string;
  quality: string;
  // foil_type removed - get finish from card
  language: string;
  price: number;
  quantity: number;
  stock: number;
  // Display fields:
  image_url?: string;
  set_name: string;
  card_number: string;
  game_name: string;
  rarity?: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
}