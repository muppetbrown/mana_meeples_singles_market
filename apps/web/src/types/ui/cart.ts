// 6. types/ui/cart.ts - UI-specific cart types
export interface CartItem {
  card_id: number;
  card_name: string;
  variation_key: string;
  quality: string;
  foil_type: string;
  language: string;
  price: number;
  quantity: number;
  image_url?: string;
  set_name: string;
  card_number?: string;
  game_name?: string;
  stock?: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
}