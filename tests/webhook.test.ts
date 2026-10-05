import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/webhooks/woocommerce/route";
import { calculateLTVTier, generateCouponCode, saveOutreachLog } from "@/lib/agent-tools";
import { calculateCustomerStatus } from "@/lib/ltv";
import { customerFromOrder, parseWooCommerceOrder } from "@/lib/webhook-parser";

function createOrder(overrides: Record<string, unknown> = {}) {
  return {
    order_id: Date.now(),
    customer_id: Math.floor(Math.random() * 100000),
    customer_email: `customer-${Date.now()}@example.com`,
    customer_name: "Test Customer",
    total: "210.50",
    date_created: new Date().toISOString(),
    line_items: [{ name: "Test item", quantity: 1, total: "210.50" }],
    ...overrides,
  };
}

describe("WooCommerce webhook", () => {
  it("parses a valid order payload", () => {
    const order = parseWooCommerceOrder(createOrder({ customer_email: "valid@example.com" }));
    expect(order.customer_email).toBe("valid@example.com");
    expect(order.total).toBe("210.50");
  });

  it("rejects invalid email payloads", () => {
    expect(() => parseWooCommerceOrder(createOrder({ customer_email: "invalid" }))).toThrow();
  });

  it("returns a customer with calculated LTV", async () => {
    const response = await POST(new Request("http://localhost/api/webhooks/woocommerce", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(createOrder({ customer_email: `route-${Date.now()}@example.com`, total: "600.00" })) }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.customer.ltv).toBe(600);
    expect(body.customer.status).toBe("VIP");
  });

  it("rejects missing required payload fields", async () => {
    const response = await POST(new Request("http://localhost/api/webhooks/woocommerce", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ customer_name: "Missing email" }) }));
    expect(response.status).toBe(400);
    expect((await response.json()).success).toBe(false);
  });
});

describe("LTV and agent tools", () => {
  it("assigns the expected customer tiers", () => {
    expect(calculateCustomerStatus(600, 0)).toBe("VIP");
    expect(calculateCustomerStatus(240, 0)).toBe("New");
    expect(calculateCustomerStatus(100, 0)).toBe("New");
    expect(calculateCustomerStatus(100, 91)).toBe("At-Risk");
    expect(calculateLTVTier("cus_1", 600)).toMatchObject({ tier: "VIP" });
    expect(calculateLTVTier("cus_2", 100, 61)).toMatchObject({ tier: "At-Risk" });
  });

  it("updates LTV and order count for a returning customer", () => {
    const first = customerFromOrder(parseWooCommerceOrder(createOrder({ customer_email: "repeat@example.com", total: "200.00" })));
    const second = customerFromOrder(parseWooCommerceOrder(createOrder({ customer_email: "repeat@example.com", total: "300.00" })), first);
    expect(second.ltv).toBe(500);
    expect(second.totalOrders).toBe(2);
  });

  it("generates a coupon and outreach log", () => {
    const coupon = generateCouponCode(15, "At-Risk retention");
    const log = saveOutreachLog("cus_1", "Win-back message", coupon.code);
    expect(coupon.code).toBe("COMEBACK15");
    expect(log.coupon).toBe("COMEBACK15");
  });
});
