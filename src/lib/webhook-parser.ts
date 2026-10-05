import { z } from "zod";
import { calculateCustomerStatus } from "./ltv";
import type { Customer, WooCommerceOrderPayload } from "./types";

const lineItemSchema = z.object({
  name: z.string(),
  quantity: z.number().int().positive(),
  total: z.string(),
});

export const woocommerceOrderSchema = z.object({
  id: z.number().optional(),
  order_id: z.number().optional(),
  customer_id: z.number().optional(),
  customer_email: z.string().email(),
  customer_name: z.string().optional(),
  total: z.string().optional().default("0"),
  date_created: z.string().optional(),
  line_items: z.array(lineItemSchema).optional(),
});

export function parseWooCommerceOrder(input: unknown): WooCommerceOrderPayload {
  return woocommerceOrderSchema.parse(input);
}

export function customerFromOrder(order: WooCommerceOrderPayload, previous?: Customer): Customer {
  const orderTotal = Number.parseFloat(order.total ?? "0") || 0;
  const orderDate = order.date_created ? new Date(order.date_created) : new Date();
  const daysSinceOrder = Math.max(0, Math.floor((Date.now() - orderDate.getTime()) / 86_400_000));
  const ltv = (previous?.ltv ?? 0) + orderTotal;
  const totalOrders = (previous?.totalOrders ?? 0) + 1;

  return {
    id: previous?.id ?? `cus_${order.customer_id ?? order.customer_email}`,
    name: order.customer_name ?? previous?.name ?? order.customer_email.split("@")[0],
    email: order.customer_email,
    ltv,
    totalOrders,
    lastOrderDate: daysSinceOrder === 0 ? "Just now" : orderDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    status: calculateCustomerStatus(ltv, daysSinceOrder),
  };
}
