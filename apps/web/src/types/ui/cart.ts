// 6. types/ui/cart.ts - UI-specific cart types
export interface CartItem {
  cardId: number;
  cardName: string;
  variationKey: string;
  quality: string;
  foilType: string;
  language: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  setName: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
}