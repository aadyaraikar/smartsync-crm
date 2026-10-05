import type { CouponCode, CustomerStatus, OutreachLog } from "./types";

export function calculateLTVTier(customerId: string, totalSpent: number, daysSinceOrder = 0): { customerId: string; tier: CustomerStatus; reason: string } {
  if (daysSinceOrder > 60) return { customerId, tier: "At-Risk", reason: "No purchase in more than 60 days" };
  if (totalSpent > 500) return { customerId, tier: "VIP", reason: "LTV is above $500" };
  if (totalSpent >= 250) return { customerId, tier: "Standard", reason: "LTV is between $250 and $500" };
  return { customerId, tier: "New", reason: "LTV is below $250" };
}

export function generateCouponCode(discountPercent: number, reason: string): CouponCode {
  const safeDiscount = Math.max(1, Math.min(50, Math.round(discountPercent)));
  const prefix = reason.toLowerCase().includes("vip") ? "VIP" : reason.toLowerCase().includes("welcome") ? "WELCOME" : "COMEBACK";
  const generatedAt = new Date();
  const expiryDate = new Date(generatedAt);
  expiryDate.setDate(expiryDate.getDate() + 30);
  return { code: `${prefix}${safeDiscount}`, discountPercent: safeDiscount, expiryDate: expiryDate.toISOString(), reason, generatedAt: generatedAt.toISOString() };
}

const outreachLogs: OutreachLog[] = [];

export function saveOutreachLog(customerId: string, message: string, coupon: string | null): OutreachLog {
  const log = { id: `log_${Date.now()}_${outreachLogs.length + 1}`, customerId, message, coupon, timestamp: new Date().toISOString() };
  outreachLogs.push(log);
  return log;
}

export function getOutreachLogs() {
  return [...outreachLogs];
}
