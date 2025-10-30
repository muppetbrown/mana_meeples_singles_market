// 3. types/models/inventory.ts - Inventory models
export interface InventoryItem {
  inventory_id: number;
  card_id: number;        // This points to a specific card variation with finish info
  variation_id?: number | null;
  quality: string;
  // foil_type removed - get finish from cards.finish via card_id
  language: string;
  price: number;
  stock_quantity: number;
  cost?: number | null;
  markup_percentage: number;
  auto_price_enabled: boolean;
  low_stock_threshold: number;
  tcgplayer_id?: string | null;
  price_source?: string | null;
  last_price_update?: string | null;
  sku?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryUpdate {
  card_id: number;
  quality: string;
  price: number;
  stock: number;
}