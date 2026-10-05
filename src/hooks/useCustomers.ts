"use client";

import { useEffect, useState } from "react";
import { seedCustomers } from "@/lib/crm-store";
import type { AgentResponse, Customer, TraceEntry } from "@/lib/types";

const initialTrace: TraceEntry[] = [
  { id: "trace-1", timestamp: new Date().toISOString(), message: "WooCommerce sync is listening for customer events", type: "result" },
  { id: "trace-2", timestamp: new Date().toISOString(), message: "Customer segments loaded", type: "thinking" },
];
const customerStorageKey = "smartsync-customers";

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>(seedCustomers);
  const [traceLog, setTraceLog] = useState<TraceEntry[]>(initialTrace);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(customerStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Customer[];
        if (Array.isArray(parsed)) setCustomers(parsed);
      }
    } catch (storageError) {
      console.warn("Unable to restore customer session", storageError);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.sessionStorage.setItem(customerStorageKey, JSON.stringify(customers));
  }, [customers, hydrated]);

  function addCustomer(customer: Customer) {
    setCustomers((current) => [customer, ...current.filter((item) => item.email !== customer.email)]);
  }

  function updateCustomer(email: string, updates: Partial<Customer>) {
    setCustomers((current) => current.map((customer) => customer.email === email ? { ...customer, ...updates } : customer));
  }

  function addTraceEntry(entry: Omit<TraceEntry, "id" | "timestamp"> & Partial<Pick<TraceEntry, "id" | "timestamp">>) {
    const completeEntry: TraceEntry = { ...entry, id: entry.id ?? `trace_${Date.now()}`, timestamp: entry.timestamp ?? new Date().toISOString() };
    setTraceLog((current) => [...current, completeEntry].slice(-50));
  }

  async function simulateOrder() {
    setLoading(true);
    setError(null);
    addTraceEntry({ message: "Receiving simulated WooCommerce order", type: "thinking" });
    try {
      const webhookResponse = await fetch("/api/webhooks/woocommerce", { method: "POST", headers: { "Content-Type": "application/json", "x-wc-webhook-topic": "order.created" }, body: JSON.stringify({ order_id: Date.now(), customer_id: 1050, customer_email: "amelia.stone@example.com", customer_name: "Amelia Stone", total: "129.00", date_created: new Date().toISOString(), line_items: [{ name: "Retention starter kit", quantity: 1, total: "129.00" }] }) });
      const webhookResult = await webhookResponse.json();
      if (!webhookResponse.ok || !webhookResult.success) throw new Error(webhookResult.error ?? "Webhook failed");
      addCustomer(webhookResult.customer);
      addTraceEntry({ message: `LTV calculated: $${webhookResult.customer.ltv}`, type: "result", toolName: "calculateLTVTier" });

      const agentResponse = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(webhookResult.customer) });
      const agentResult = await agentResponse.json() as AgentResponse;
      if (!agentResponse.ok || !agentResult.success) throw new Error(agentResult.error ?? "Agent failed");
      agentResult.traceEntries?.forEach((entry) => addTraceEntry(entry));
      updateCustomer(webhookResult.customer.email, { aiAction: agentResult.recommendation });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to process order";
      setError(message);
      addTraceEntry({ message, type: "result" });
    } finally {
      setLoading(false);
    }
  }

  return { customers, traceLog, addCustomer, updateCustomer, addTraceEntry, simulateOrder, loading, error };
}
