"use client";

import { useState } from "react";
import { Activity, ArrowUpRight, Bell, Bot, ChevronDown, CircleHelp, Mail, Plus, RefreshCw, Search, Sparkles, Users } from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
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
  const { customers, traceLog, simulateOrder, loading: isSimulating, error } = useCustomers();
  const [query, setQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"ltv" | "totalOrders">("ltv");
  const [sendingCampaign, setSendingCampaign] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const visibleCustomers = [...customers].filter((customer) => `${customer.name} ${customer.email}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b[sortKey] - a[sortKey]);
  const totalRevenue = customers.reduce((sum, customer) => sum + customer.ltv, 0);

  function openCustomerStrategy(customer: Customer) {
    window.sessionStorage.setItem("smartsync-selected-customer", JSON.stringify(customer));
    window.location.href = `/customers/${encodeURIComponent(customer.id)}`;
  }

  async function sendCampaign(customer: Customer) {
    const campaignType = customer.status === "VIP" ? "vip" : customer.status === "At-Risk" ? "at-risk" : "welcome";
    const couponCode = campaignType === "vip" ? "VIP15" : campaignType === "at-risk" ? "COMEBACK10" : "WELCOME10";
    setSendingCampaign(customer.id);
    setToast(null);
    try {
      const response = await fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: customer.id, customerEmail: customer.email, campaignType, couponCode }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message ?? "Unable to send email");
      setToast({ kind: "success", message: result.message });
    } catch (caughtError) {
      setToast({ kind: "error", message: caughtError instanceof Error ? caughtError.message : "Unable to send email" });
    } finally {
      window.setTimeout(() => setSendingCampaign(null), 2000);
      window.setTimeout(() => setToast(null), 4500);
    }
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
          {toast && <div className={`campaign-toast toast-${toast.kind}`} role="status"><Mail size={15} /> {toast.message}</div>}
          <div className="live-banner"><span className="live-dot" /> Live sync active <span className="banner-divider" /> Last event 2 min ago <ArrowUpRight size={15} /></div>
          <section className="hero-row"><div><p className="eyebrow accent">Retention command center</p><h2>Keep every customer<br /><em>coming back.</em></h2><p className="hero-copy">SmartSync turns WooCommerce signals into timely retention actions, so your best customers never go quiet.</p></div><div className="hero-orbit"><div className="orbit-card"><Bot size={18} /><span>AI is monitoring<br /><strong>24/7</strong></span></div><div className="orbit-ring" /></div></section>
          <section className="stats-grid"><div className="stat-card"><span className="stat-label">Total customers</span><strong>{customers.length.toLocaleString()}</strong><span className="stat-change positive">+12.5% <small>vs last month</small></span></div><div className="stat-card"><span className="stat-label">Customer LTV</span><strong>{formatCurrency(totalRevenue)}</strong><span className="stat-change positive">+8.2% <small>vs last month</small></span></div><div className="stat-card"><span className="stat-label">At-risk customers</span><strong>{customers.filter((customer) => customer.status === "At-Risk").length}</strong><span className="stat-change warning">Needs attention <small>this week</small></span></div><div className="stat-card"><span className="stat-label">AI actions taken</span><strong>{traceLog.filter((entry) => entry.type === "action").length}</strong><span className="stat-change neutral">Live trace <small>this session</small></span></div></section>
          {error && <div className="dashboard-error">{error}</div>}
          <section className="trace-section" aria-label="Live agent execution trace"><div className="trace-header"><div><h3>Live agentic AI execution trace</h3><p>Every webhook and retention action, as it happens</p></div><span className="trace-live"><span className="live-dot" /> Live</span></div><div className="trace-log">{traceLog.slice(-10).map((entry) => <div className={`trace-entry trace-${entry.type}`} key={entry.id}><span className="trace-marker">{entry.type === "thinking" ? "..." : entry.type === "action" ? "!" : "✓"}</span><span>{entry.message}</span><time>{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>)}</div></section>
          <section className="table-section" id="customers"><div className="section-heading"><div><h3>Customer activity</h3><p>Real-time view of your customer base</p></div><div className="table-tools"><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers" /></label><button className="filter-button" onClick={() => setSortKey(sortKey === "ltv" ? "totalOrders" : "ltv")}><RefreshCw size={15} /> Sort {sortKey === "ltv" ? "orders" : "LTV"}</button></div></div><div className="table-wrap"><table><thead><tr><th>Customer</th><th><button className="table-sort" onClick={() => setSortKey("ltv")}>LTV</button></th><th><button className="table-sort" onClick={() => setSortKey("totalOrders")}>Orders</button></th><th>Last order</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visibleCustomers.map((customer) => <tr className={selectedCustomer === customer.id ? "selected-row" : ""} key={customer.id} onClick={() => setSelectedCustomer(customer.id)}><td><div className="customer-cell"><span className="customer-avatar">{customer.name.split(" ").map((part) => part[0]).join("")}</span><span><strong>{customer.name}</strong><small>{customer.email}</small></span></div></td><td className="money">{formatCurrency(customer.ltv)}</td><td>{customer.totalOrders}</td><td>{customer.lastOrderDate}</td><td><span className={`status-pill ${statusStyles[customer.status]}`}>{customer.status}</span></td><td><div className="row-actions"><button className="row-action" aria-label={`Open strategy for ${customer.name}`} onClick={(event) => { event.stopPropagation(); openCustomerStrategy(customer); }}><Sparkles size={16} /></button><button className="email-action" aria-label={`Send campaign to ${customer.name}`} onClick={(event) => { event.stopPropagation(); void sendCampaign(customer); }} disabled={sendingCampaign === customer.id}>{sendingCampaign === customer.id ? "Sending..." : "Email"}</button></div></td></tr>)}</tbody></table></div></section>
          <section className="agent-panel" id="automations"><div className="agent-heading"><span className="agent-icon"><Bot size={18} /></span><div><h3>Retention copilot</h3><p>Open a customer strategy from the sparkle action in the table.</p></div></div><div className="agent-empty"><Bot size={20} /><span>Each customer has a detailed retention plan with objectives, messaging, timing, and success metrics.</span></div></section>
        </div>
      </section>
    </main>
  );
}
