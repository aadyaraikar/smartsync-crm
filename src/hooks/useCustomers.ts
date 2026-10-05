"use client";

import { useEffect, useState } from "react";
import { seedCustomers } from "@/lib/crm-store";
import type { AgentResponse, Customer, TraceEntry } from "@/lib/types";

const initialTrace: TraceEntry[] = [
  { id: "trace-1", timestamp: new Date().toISOString(), message: "WooCommerce sync is listening for customer events", type: "result" },
  { id: "trace-2", timestamp: new Date().toISOString(), message: "Customer segments loaded", type: "thinking" },
];
const customerStorageKey = "smartsync-customers";
const simulatedProfiles = [
  { id: 2001, name: "Amelia Stone", email: "amelia.stone@example.com" },
  { id: 2002, name: "Leo Morgan", email: "leo.morgan@example.com" },
  { id: 2003, name: "Isla Brooks", email: "isla.brooks@example.com" },
  { id: 2004, name: "Noah Kim", email: "noah.kim@example.com" },
  { id: 2005, name: "Zoe Carter", email: "zoe.carter@example.com" },
];

function persistCustomers(customers: Customer[]) {
  try {
    const serialized = JSON.stringify(customers);
    window.sessionStorage.setItem(customerStorageKey, serialized);
    window.localStorage.setItem(customerStorageKey, serialized);
  } catch (storageError) {
    console.warn("Unable to persist customer session", storageError);
  }
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>(seedCustomers);
  const [traceLog, setTraceLog] = useState<TraceEntry[]>(initialTrace);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(customerStorageKey) ?? window.sessionStorage.getItem(customerStorageKey);
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
    persistCustomers(customers);
  }, [customers, hydrated]);

  function addCustomer(customer: Customer) {
    setCustomers((current) => {
      const next = [customer, ...current.filter((item) => item.email !== customer.email)];
      persistCustomers(next);
      return next;
    });
  }

  function updateCustomer(email: string, updates: Partial<Customer>) {
    setCustomers((current) => {
      const next = current.map((customer) => customer.email === email ? { ...customer, ...updates } : customer);
      persistCustomers(next);
      return next;
    });
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
      const profile = simulatedProfiles[Math.max(0, customers.length - seedCustomers.length) % simulatedProfiles.length];
      const webhookResponse = await fetch("/api/webhooks/woocommerce", { method: "POST", headers: { "Content-Type": "application/json", "x-wc-webhook-topic": "order.created" }, body: JSON.stringify({ order_id: Date.now(), customer_id: profile.id, customer_email: profile.email, customer_name: profile.name, total: "129.00", date_created: new Date().toISOString(), line_items: [{ name: "Retention starter kit", quantity: 1, total: "129.00" }] }) });
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
