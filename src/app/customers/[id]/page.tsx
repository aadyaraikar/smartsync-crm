"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Bot, CheckCircle2, Clock3, Mail, Sparkles, Target, UserRound } from "lucide-react";
import { seedCustomers } from "@/lib/crm-store";
import type { Customer } from "@/lib/types";

type Strategy = {
  customer: Customer;
  summary: string;
  recommendation: string;
  actions: string[];
  riskLevel: string;
  objectives: string[];
  strategy: string[];
  message: string;
  timing: string;
  successMetrics: string[];
  source: "openai" | "fallback";
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function CustomerStrategyPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStrategy() {
      try {
        const stored = window.sessionStorage.getItem("smartsync-selected-customer");
        const storedCustomer = stored ? JSON.parse(stored) as Customer : null;
        let selected = storedCustomer?.id === params.id ? storedCustomer : seedCustomers.find((item) => item.id === params.id) ?? null;
        if (!selected) {
          const response = await fetch("/api/webhooks/woocommerce");
          const result = await response.json();
          selected = result.customers?.find((item: Customer) => item.id === params.id) ?? null;
        }
        if (!selected) throw new Error("Customer could not be found");
        setCustomer(selected);
        const response = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(selected) });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error ?? "Strategy generation failed");
        setStrategy(result as Strategy);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load customer strategy");
      }
    }
    void loadStrategy();
  }, [params.id]);

  if (error) return <main className="strategy-shell"><a className="back-link" href="/"> <ArrowLeft size={16} /> Back to overview</a><div className="error-state"><Bot size={24} /><h1>Strategy unavailable</h1><p>{error}</p></div></main>;
  if (!customer || !strategy) return <main className="strategy-shell"><a className="back-link" href="/"><ArrowLeft size={16} /> Back to overview</a><div className="loading-state"><Bot size={24} /><p>Building a customer strategy...</p></div></main>;

  return (
    <main className="strategy-shell">
      <header className="strategy-topbar"><a className="back-link" href="/"><ArrowLeft size={16} /> Back to overview</a><span className="strategy-source"><span className="live-dot" /> {strategy.source === "openai" ? "AI strategy generated" : "Copilot strategy ready"}</span></header>
      <div className="strategy-content">
        <section className="strategy-hero"><div><p className="eyebrow accent">Customer intelligence / Retention plan</p><div className="strategy-title"><span className="large-avatar">{customer.name.split(" ").map((part) => part[0]).join("")}</span><div><h1>{customer.name}</h1><p>{customer.email}</p></div></div><div className="strategy-tags"><span className={`status-pill status-${customer.status.toLowerCase().replace("-", "")}`}>{customer.status}</span><span className="risk-tag"><Sparkles size={13} /> {strategy.riskLevel}</span></div></div><div className="strategy-hero-stat"><span>Customer LTV</span><strong>{formatCurrency(customer.ltv)}</strong><small>{customer.totalOrders} total orders</small></div></section>
  <section className="strategy-grid"><article className="strategy-card signal-card"><div className="card-kicker"><UserRound size={15} /> Customer signal</div><p className="lead-copy">{strategy.summary}</p><div className="signal-facts"><span><strong>{customer.totalOrders}</strong> orders</span><span><strong>{formatCurrency(customer.ltv)}</strong> lifetime value</span><span><strong>{customer.lastOrderDate}</strong> last order</span></div></article><article className="strategy-card recommendation-card"><div className="card-kicker"><Bot size={15} /> Copilot recommendation</div><p className="lead-copy">{strategy.recommendation}</p><button className="primary-action"><Mail size={15} /> Create campaign draft</button></article></section>
  <section className="detail-section"><div className="detail-heading"><div><p className="eyebrow accent">The playbook</p><h2>A strategy built for {customer.name.split(" ")[0]}</h2></div><span className="detail-time"><Clock3 size={15} /> {strategy.timing}</span></div><div className="playbook-grid"><article className="playbook-card"><div className="card-kicker"><Target size={15} /> Objectives</div><ul>{strategy.objectives.map((item) => <li key={item}><CheckCircle2 size={15} />{item}</li>)}</ul></article><article className="playbook-card"><div className="card-kicker"><Sparkles size={15} /> Recommended sequence</div><ol>{strategy.strategy.map((item, index) => <li key={item}><span>{index + 1}</span>{item}</li>)}</ol></article></div></section>
  <section className="message-section"><div className="message-heading"><div><p className="eyebrow accent">Ready to activate</p><h2>Suggested message</h2></div><button className="secondary-action"><ArrowUpRight size={15} /> Use this draft</button></div><div className="message-card"><div className="message-meta"><span><Mail size={14} /> Email</span><span>Personalized retention message</span></div><p>{strategy.message}</p></div></section>
  <section className="metrics-section"><div className="card-kicker"><Target size={15} /> Success signals to watch</div><div className="metric-list">{strategy.successMetrics.map((metric) => <span key={metric}><CheckCircle2 size={15} />{metric}</span>)}</div></section>
      </div>
    </main>
  );
}
