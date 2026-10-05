import { NextResponse } from "next/server";
import { customerFromOrder, parseWooCommerceOrder } from "@/lib/webhook-parser";
import { seedCustomers } from "@/lib/crm-store";
import type { Customer } from "@/lib/types";

const customers = new Map(seedCustomers.map((customer) => [customer.email, customer]));

export async function POST(request: Request) {
  try {
    const topic = request.headers.get("x-wc-webhook-topic");
    if (topic && topic !== "order.created" && topic !== "customer.created") {
      return NextResponse.json({ success: false, error: `Unsupported webhook topic: ${topic}` }, { status: 400 });
    }

    const order = parseWooCommerceOrder(await request.json());
    const previous = customers.get(order.customer_email);
    const customer = customerFromOrder(order, previous);
    customers.set(customer.email, customer);

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid WooCommerce webhook payload";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ customers: Array.from(customers.values()) as Customer[] });
}
