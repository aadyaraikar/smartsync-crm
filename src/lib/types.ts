export type CustomerStatus = "VIP" | "Standard" | "At-Risk" | "New";

export interface WooCommerceLineItem {
  name: string;
  quantity: number;
  total: string;
}

export interface WooCommerceOrderPayload {
  id?: number;
  order_id?: number;
  customer_id?: number;
  customer_email: string;
  customer_name?: string;
  total: string;
  date_created?: string;
  line_items?: WooCommerceLineItem[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  ltv: number;
  totalOrders: number;
  lastOrderDate: string;
  status: CustomerStatus;
}
