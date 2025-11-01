// 3. types/models/inventory.ts - Inventory models
export interface InventoryItem {
  inventory_id: number;
  card_id: number;        // This points to a specific card variation with finish info
  quality: string;
  stock_quantity: number;
  price: number;
  price_source?: string | null;
  last_price_update?: string | null;
  created_at: string;
  updated_at: string;
  cost?: number | null;
  markup_percentage: number;
  auto_price_enabled: boolean;
  low_stock_threshold: number;
}

export interface InventoryUpdate {
  card_id: number;
  quality: string;
  price: number;
  stock: number;
}