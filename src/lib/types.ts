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
  aiAction?: string;
  createdAt?: string;
}

export interface OrderItem {
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice?: number;
  total: number;
}

export interface Order {
  orderId: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
}

export type TraceEntryType = "thinking" | "action" | "result";

export interface TraceEntry {
  id: string;
  timestamp: string;
  message: string;
  type: TraceEntryType;
  toolName?: string;
  toolInput?: unknown;
  toolOutput?: unknown;
}

export interface CouponCode {
  code: string;
  discountPercent: number;
  expiryDate: string;
  reason: string;
  generatedAt: string;
}

export interface ToolCall {
  tool: "calculateLTVTier" | "generateCouponCode" | "saveOutreachLog";
  input: unknown;
  output: unknown;
  timestamp: string;
}

export interface OutreachLog {
  id: string;
  customerId: string;
  message: string;
  coupon: string | null;
  timestamp: string;
}

export interface AgentResponse {
  success: boolean;
  customer: Customer;
  summary: string;
  recommendation: string;
  actions: string[];
  riskLevel: string;
  objectives: string[];
  strategy: string[];
  message: string;
  timing: string;
  successMetrics: string[];
  toolCalls: ToolCall[];
  traceEntries: TraceEntry[];
  source: "openai" | "fallback";
  error?: string;
}
