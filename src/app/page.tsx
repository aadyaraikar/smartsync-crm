"use client";

import { useState } from "react";
import { Activity, ArrowUpRight, Bell, Bot, ChevronDown, CircleHelp, Plus, RefreshCw, Search, Sparkles, Users } from "lucide-react";
import { seedCustomers } from "@/lib/crm-store";
import type { Customer, CustomerStatus } from "@/lib/types";

const statusStyles: Record<CustomerStatus, string> = {
  VIP: "status-vip",
  Standard: "status-standard",
  "At-Risk": "status-risk",
  New: "status-new",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function Home() {
  const [customers, setCustomers] = useState<Customer[]>(seedCustomers);
  const [isSimulating, setIsSimulating] = useState(false);
  const [query, setQuery] = useState("");
  const [isThinking] = useState(false);
  const [agentResult] = useState<{ customer: Customer; summary: string; recommendation: string; actions: string[]; source: string } | null>(null);
  const visibleCustomers = customers.filter((customer) => `${customer.name} ${customer.email}`.toLowerCase().includes(query.toLowerCase()));
  const totalRevenue = customers.reduce((sum, customer) => sum + customer.ltv, 0);

  async function simulateOrder() {
    setIsSimulating(true);
    try {
      const response = await fetch("/api/webhooks/woocommerce", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-wc-webhook-topic": "order.created" },
        body: JSON.stringify({
          order_id: Date.now(),
          customer_id: 1050,
          customer_email: "amelia.stone@example.com",
          customer_name: "Amelia Stone",
          total: "129.00",
          date_created: new Date().toISOString(),
          line_items: [{ name: "Retention starter kit", quantity: 1, total: "129.00" }],
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error ?? "Webhook failed");
      setCustomers((current) => [result.customer as Customer, ...current.filter((customer) => customer.email !== result.customer.email)]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSimulating(false);
    }
  }

  function openCustomerStrategy(customer: Customer) {
    window.sessionStorage.setItem("smartsync-selected-customer", JSON.stringify(customer));
    window.location.href = `/customers/${encodeURIComponent(customer.id)}`;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Activity size={17} /></span><span>SmartSync</span></div>
        <nav className="nav-list" aria-label="Main navigation">
          <a className="nav-item active" href="#overview"><Activity size={17} /> Overview</a>
          <a className="nav-item" href="#customers"><Users size={17} /> Customers <span className="nav-count">{customers.length}</span></a>
          <a className="nav-item" href="#automations"><Sparkles size={17} /> Automations</a>
        </nav>
        <div className="sidebar-bottom"><a className="nav-item" href="#help"><CircleHelp size={17} /> Help center</a><div className="profile"><span className="avatar">AR</span><span><strong>Aadya Raikar</strong><small>Admin workspace</small></span><ChevronDown size={15} /></div></div>
      </aside>
      <section className="workspace" id="overview">
        <header className="topbar"><div><p className="eyebrow">Workspace / Overview</p><h1>Good morning, Aadya</h1></div><div className="top-actions"><button className="icon-button" aria-label="Notifications"><Bell size={18} /><span className="notification-dot" /></button><button className="simulate-button" onClick={simulateOrder} disabled={isSimulating}><Plus size={17} /> {isSimulating ? "Syncing..." : "Simulate order"}</button></div></header>
        <div className="content">
          <div className="live-banner"><span className="live-dot" /> Live sync active <span className="banner-divider" /> Last event 2 min ago <ArrowUpRight size={15} /></div>
          <section className="hero-row"><div><p className="eyebrow accent">Retention command center</p><h2>Keep every customer<br /><em>coming back.</em></h2><p className="hero-copy">SmartSync turns WooCommerce signals into timely retention actions, so your best customers never go quiet.</p></div><div className="hero-orbit"><div className="orbit-card"><Bot size={18} /><span>AI is monitoring<br /><strong>24/7</strong></span></div><div className="orbit-ring" /></div></section>
          <section className="stats-grid"><div className="stat-card"><span className="stat-label">Total customers</span><strong>{customers.length.toLocaleString()}</strong><span className="stat-change positive">+12.5% <small>vs last month</small></span></div><div className="stat-card"><span className="stat-label">Customer LTV</span><strong>{formatCurrency(totalRevenue)}</strong><span className="stat-change positive">+8.2% <small>vs last month</small></span></div><div className="stat-card"><span className="stat-label">At-risk customers</span><strong>{customers.filter((customer) => customer.status === "At-Risk").length}</strong><span className="stat-change warning">Needs attention <small>this week</small></span></div><div className="stat-card"><span className="stat-label">AI actions taken</span><strong>38</strong><span className="stat-change neutral">+6 <small>today</small></span></div></section>
          <section className="table-section" id="customers"><div className="section-heading"><div><h3>Customer activity</h3><p>Real-time view of your customer base</p></div><div className="table-tools"><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers" /></label><button className="filter-button"><RefreshCw size={15} /> Refresh</button></div></div><div className="table-wrap"><table><thead><tr><th>Customer</th><th>LTV</th><th>Orders</th><th>Last order</th><th>Status</th><th /></tr></thead><tbody>{visibleCustomers.map((customer) => <tr key={customer.id}><td><div className="customer-cell"><span className="customer-avatar">{customer.name.split(" ").map((part) => part[0]).join("")}</span><span><strong>{customer.name}</strong><small>{customer.email}</small></span></div></td><td className="money">{formatCurrency(customer.ltv)}</td><td>{customer.totalOrders}</td><td>{customer.lastOrderDate}</td><td><span className={`status-pill ${statusStyles[customer.status]}`}>{customer.status}</span></td><td><button className="row-action" aria-label={`Open strategy for ${customer.name}`} onClick={() => openCustomerStrategy(customer)}><Sparkles size={16} /></button></td></tr>)}</tbody></table></div></section>
          <section className="agent-panel" id="automations"><div className="agent-heading"><span className="agent-icon"><Bot size={18} /></span><div><h3>Retention copilot</h3><p>{agentResult ? `Analysis for ${agentResult.customer.name}` : "Select a customer to generate a retention plan"}</p></div>{isThinking && <span className="thinking">Thinking...</span>}</div>{agentResult ? <div className="agent-content"><div><span className="agent-label">Customer signal</span><p>{agentResult.summary}</p></div><div><span className="agent-label">Recommended next move</span><p>{agentResult.recommendation}</p></div><div><span className="agent-label">Suggested actions</span><div className="action-list">{agentResult.actions.map((action) => <span key={action}><Sparkles size={13} />{action}</span>)}</div></div><small className="agent-source">{agentResult.source === "openai" ? "Generated by OpenAI" : "Local strategy fallback - add OPENAI_API_KEY for live AI"}</small></div> : <div className="agent-empty"><Bot size={20} /><span>Use the sparkle button on any customer row to inspect their retention opportunity.</span></div>}</section>
        </div>
      </section>
    </main>
  );
}
