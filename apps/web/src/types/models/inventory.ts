// 3. types/models/inventory.ts - Inventory models
export interface InventoryItem {
  inventory_id: number;
  card_id: number;
  quality: string;
  foil_type: string;
  language: string;
  price: number;
  stock_quantity: number;
  price_source?: string | null;
}

export interface InventoryUpdate {
  card_id: number;
  quality: string;
  price: number;
  stock: number;
}