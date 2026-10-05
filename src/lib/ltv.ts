import type { CustomerStatus } from "./types";

export function calculateCustomerStatus(ltv: number, daysSinceOrder: number): CustomerStatus {
  if (daysSinceOrder > 90) return "At-Risk";
  if (ltv >= 500) return "VIP";
  if (ltv === 0) return "New";
  return "Standard";
}
