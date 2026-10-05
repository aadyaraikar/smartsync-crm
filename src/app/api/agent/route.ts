import { NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output, stepCountIs, tool } from "ai";
import { z } from "zod";
import { calculateLTVTier, generateCouponCode, saveOutreachLog } from "@/lib/agent-tools";
import type { AgentResponse, Customer, ToolCall, TraceEntry } from "@/lib/types";

const calculateLTVTierInput = z.object({ customerId: z.string(), totalSpent: z.number() });
const generateCouponCodeInput = z.object({ discountPercent: z.number(), reason: z.string() });
const saveOutreachLogInput = z.object({ customerId: z.string(), message: z.string(), coupon: z.string().nullable() });

const strategyOutput = z.object({
  summary: z.string(),
  recommendation: z.string(),
  actions: z.array(z.string()).min(1).max(3),
  riskLevel: z.string(),
  objectives: z.array(z.string()).min(1).max(3),
  strategy: z.array(z.string()).min(1).max(4),
  message: z.string(),
  timing: z.string(),
  successMetrics: z.array(z.string()).min(1).max(4),
});

function createAgentTools() {
  return {
    calculateLTVTier: tool({
      description: "Determine customer tier based on LTV and recent purchase behavior.",
      inputSchema: calculateLTVTierInput,
      execute: ({ customerId, totalSpent }) => calculateLTVTier(customerId, totalSpent),
    }),
    generateCouponCode: tool({
      description: "Generate a personalized retention coupon when an incentive is appropriate.",
      inputSchema: generateCouponCodeInput,
      execute: ({ discountPercent, reason }) => generateCouponCode(discountPercent, reason),
    }),
    saveOutreachLog: tool({
      description: "Log the retention action and optional coupon for tracking.",
      inputSchema: saveOutreachLogInput,
      execute: ({ customerId, message, coupon }) => saveOutreachLog(customerId, message, coupon),
    }),
  };
}

function sdkTrace(steps: unknown[]): { toolCalls: ToolCall[]; traceEntries: TraceEntry[] } {
  const toolCalls: ToolCall[] = [];
  const traceEntries: TraceEntry[] = [];
  for (const step of steps as Array<{ toolCalls?: Array<{ toolName: string; input: unknown }>; toolResults?: Array<{ toolName: string; output: unknown }> }>) {
    for (const call of step.toolCalls ?? []) {
      const result = step.toolResults?.find((toolResult) => toolResult.toolName === call.toolName);
      const timestamp = new Date().toISOString();
      if (["calculateLTVTier", "generateCouponCode", "saveOutreachLog"].includes(call.toolName)) {
        toolCalls.push({ tool: call.toolName as ToolCall["tool"], input: call.input, output: result?.output ?? null, timestamp });
        traceEntries.push({ id: `trace_${Date.now()}_${toolCalls.length}`, timestamp, message: `AI called ${call.toolName}`, type: "action", toolName: call.toolName, toolInput: call.input, toolOutput: result?.output });
      }
    }
  }
  return { toolCalls, traceEntries };
}

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

    const openai = createOpenAI({ apiKey });
    const tools = createAgentTools();
    const result = await generateText({
      model: openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
      system: "You are an autonomous CRM retention agent. Analyze the customer, call calculateLTVTier first, decide whether an incentive is useful, call generateCouponCode when appropriate, and always call saveOutreachLog. Then return a practical detailed retention strategy. Never invent tool outputs.",
      prompt: JSON.stringify(customer),
      tools,
      toolChoice: "auto",
      stopWhen: stepCountIs(6),
      output: Output.object({ schema: strategyOutput }),
    });
    const traced = sdkTrace(await result.steps);
    if (traced.toolCalls.length === 0 || !result.output) {
      console.warn("AI agent completed without the expected tool calls", { customerId: customer.id });
      return NextResponse.json(fallback);
    }
    return NextResponse.json({ success: true, customer, ...result.output, toolCalls: traced.toolCalls, traceEntries: traced.traceEntries, source: "openai" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Agent request failed" }, { status: 400 });
  }
}
