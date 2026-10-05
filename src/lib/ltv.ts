import type { CustomerStatus } from "./types";

export function calculateCustomerStatus(ltv: number, daysSinceOrder: number): CustomerStatus {
  if (daysSinceOrder > 60) return "At-Risk";
  if (ltv > 500) return "VIP";
  if (ltv >= 250) return "Standard";
  return "New";
}
