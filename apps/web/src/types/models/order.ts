// 2. types/models/order.ts - Order domain models
export interface OrderItem {
  card_name: string;
  quality: string;
  quantity: number;
  unit_price: string;
  total_price: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Order {
  id: number;
  customer_name: string;
  customer_email: string;
  total: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  payment_intent_id: string;
  items?: OrderItem[];
}

export interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  address: string;
  suburb?: string;
  city: string;
  region: string;
  postalCode: string;
  notes?: string;
}