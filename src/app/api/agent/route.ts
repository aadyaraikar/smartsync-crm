import { NextResponse } from "next/server";
import { calculateLTVTier, generateCouponCode, saveOutreachLog } from "@/lib/agent-tools";
import type { AgentResponse, Customer, ToolCall, TraceEntry } from "@/lib/types";

function fallbackRecommendation(customer: Customer): AgentResponse {
  const daysSinceOrder = Number.isNaN(Date.parse(customer.lastOrderDate)) ? 0 : Math.floor((Date.now() - Date.parse(customer.lastOrderDate)) / 86_400_000);
  const tierResult = calculateLTVTier(customer.id, customer.ltv, daysSinceOrder);
  const atRisk = customer.status === "At-Risk" || tierResult.tier === "At-Risk";
  const summary = atRisk
    ? `${customer.name} has not ordered recently despite ${customer.totalOrders} previous orders.`
    : `${customer.name} is an active ${customer.status.toLowerCase()} customer with ${customer.totalOrders} order${customer.totalOrders === 1 ? "" : "s"}.`;

  const timestamp = new Date().toISOString();
  const toolCalls: ToolCall[] = [{ tool: "calculateLTVTier", input: { customerId: customer.id, totalSpent: customer.ltv }, output: tierResult, timestamp }];
  const traceEntries: TraceEntry[] = [
    { id: `trace_${Date.now()}_1`, timestamp, message: "Analyzing customer LTV and purchase behavior", type: "thinking", toolName: "calculateLTVTier" },
    { id: `trace_${Date.now()}_2`, timestamp, message: `Customer tier: ${tierResult.tier} (${tierResult.reason})`, type: "result", toolName: "calculateLTVTier", toolOutput: tierResult },
  ];
  const discount = atRisk ? 15 : customer.status === "New" ? 10 : 0;
  if (discount > 0) {
    const coupon = generateCouponCode(discount, atRisk ? "At-Risk retention" : "New customer welcome");
    toolCalls.push({ tool: "generateCouponCode", input: { discountPercent: discount, reason: coupon.reason }, output: coupon, timestamp: new Date().toISOString() });
    traceEntries.push({ id: `trace_${Date.now()}_3`, timestamp: new Date().toISOString(), message: `Generated code: ${coupon.code} (${coupon.discountPercent}% off)`, type: "action", toolName: "generateCouponCode", toolOutput: coupon });
    const outreach = saveOutreachLog(customer.id, atRisk ? "Win-back retention offer" : "Welcome follow-up", coupon.code);
    toolCalls.push({ tool: "saveOutreachLog", input: { customerId: customer.id, message: outreach.message, coupon: coupon.code }, output: outreach, timestamp: outreach.timestamp });
    traceEntries.push({ id: `trace_${Date.now()}_4`, timestamp: outreach.timestamp, message: "Outreach action logged for activation", type: "result", toolName: "saveOutreachLog", toolOutput: outreach });
  } else {
    const outreach = saveOutreachLog(customer.id, "Loyalty follow-up recommended", null);
    toolCalls.push({ tool: "saveOutreachLog", input: { customerId: customer.id, message: outreach.message, coupon: null }, output: outreach, timestamp: outreach.timestamp });
    traceEntries.push({ id: `trace_${Date.now()}_3`, timestamp: outreach.timestamp, message: "Loyalty follow-up logged without discount", type: "result", toolName: "saveOutreachLog", toolOutput: outreach });
  }

  return {
    success: true,
    customer,
    summary,
    recommendation: atRisk
      ? "Send a personal win-back message with a time-limited offer and a reminder of the products they previously purchased."
      : "Keep the relationship warm with a relevant product follow-up and a loyalty reward after the next purchase.",
    actions: atRisk
      ? ["Create a win-back campaign", "Offer 15% off for 7 days", "Review previous order categories"]
      : ["Add to loyalty audience", "Send a product follow-up", "Monitor next order timing"],
    riskLevel: atRisk ? "High attention" : customer.status === "New" ? "Early relationship" : "Healthy relationship",
    objectives: atRisk
      ? ["Reopen the conversation without discounting too aggressively", "Learn whether product fit or timing caused the gap", "Create a reason to purchase within the next 14 days"]
      : ["Move the customer toward a second purchase", "Build a preference signal from their next interaction", "Increase repeat purchase confidence without unnecessary discounting"],
    strategy: atRisk
      ? ["Start with a personal message referencing their previous purchase category.", "Offer a single-use 15% incentive with a seven-day expiry.", "If there is no engagement after four days, send one softer reminder and then pause."]
      : ["Send a useful follow-up related to the customer’s first purchase.", "Invite them into the loyalty audience and reward the next order.", "Use the next click or purchase to personalize future recommendations."],
    message: atRisk
      ? `Hi ${customer.name.split(" ")[0]}, we noticed it has been a while since your last order. We saved a little something for your next purchase: 15% off for the next 7 days. We would love to help you find your next favorite.`
      : `Hi ${customer.name.split(" ")[0]}, we hope you are enjoying your recent order. We found a few products that pair well with it and added a loyalty reward to your account for your next visit.`,
    timing: atRisk ? "Send today at 10:00 AM local time, then follow up once after 4 days." : "Send within 48 hours of the next meaningful site visit or product interaction.",
    successMetrics: ["Email open rate above 38%", "Click-through rate above 6%", "A repeat purchase or meaningful product view within 14 days"],
    toolCalls,
    traceEntries,
    source: "fallback",
  };
}

export async function POST(request: Request) {
  try {
    const customer = (await request.json()) as Customer;
    if (!customer?.email || !customer?.name) {
      return NextResponse.json({ success: false, error: "A customer name and email are required" }, { status: 400 });
    }

    const fallback = fallbackRecommendation(customer);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json(fallback);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a customer retention strategist. Return JSON with summary, recommendation, actions, riskLevel, objectives, strategy, message, timing, and successMetrics. Arrays should contain concise, practical strings." },
          { role: "user", content: JSON.stringify(customer) },
        ],
      }),
    });
    if (!response.ok) return NextResponse.json(fallback);

    const data = await response.json();
    const result = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    return NextResponse.json({ success: true, customer, summary: result.summary ?? fallback.summary, recommendation: result.recommendation ?? fallback.recommendation, actions: Array.isArray(result.actions) ? result.actions.slice(0, 3) : fallback.actions, riskLevel: result.riskLevel ?? fallback.riskLevel, objectives: Array.isArray(result.objectives) ? result.objectives : fallback.objectives, strategy: Array.isArray(result.strategy) ? result.strategy : fallback.strategy, message: result.message ?? fallback.message, timing: result.timing ?? fallback.timing, successMetrics: Array.isArray(result.successMetrics) ? result.successMetrics : fallback.successMetrics, toolCalls: fallback.toolCalls, traceEntries: fallback.traceEntries, source: "openai" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Agent request failed" }, { status: 400 });
  }
}
