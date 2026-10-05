# SmartSync CRM

SmartSync CRM is a WooCommerce retention workspace that turns order events into customer LTV updates and actionable retention strategies. It includes a dashboard, webhook receiver, execution trace, coupon/outreach tools, and a detailed customer strategy page.

## Features

- WooCommerce-style `order.created` and `customer.created` webhook handling
- LTV and customer status calculation for VIP, Standard, At-Risk, and New customers
- Simulated WooCommerce orders from the dashboard
- Ten seeded customers with search, sorting, row selection, and responsive UI
- Live agent execution trace with thinking, action, and result events
- Retention Copilot customer strategy pages
- `calculateLTVTier`, `generateCouponCode`, and `saveOutreachLog` tools
- Optional OpenAI strategy generation with a local fallback when no API key is present
- Vitest coverage for webhook parsing, LTV calculations, repeat orders, and agent tools

## Tech Stack

- Next.js 14 App Router
- TypeScript and React 18
- Tailwind CSS with local dashboard styling
- Zod payload validation
- Lucide React icons
- Vitest
- Optional OpenAI Chat Completions integration

## Quick Start

Requirements: Node.js 18+ and npm.

```bash
git clone https://github.com/aadyaraikar/smartsync-crm.git
cd smartsync-crm
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For live OpenAI recommendations, copy `.env.local.example` to `.env.local` and set `OPENAI_API_KEY`. The local fallback works without a key.

## Workflow

1. The dashboard loads seeded customer records.
2. **Simulate order** sends a WooCommerce-shaped payload to `POST /api/webhooks/woocommerce`.
3. The webhook validates the payload, updates LTV and status, and returns the customer.
4. The execution trace records webhook and agent activity.
5. The sparkle action opens `/customers/[id]`.
6. The customer page calls `POST /api/agent` and displays the signal, recommendation, playbook, draft message, timing, and success metrics.

## API Routes

### `POST /api/webhooks/woocommerce`

Accepts an order payload with `customer_email`, optional `customer_id`, `customer_name`, `total`, `date_created`, and `line_items`. The optional `x-wc-webhook-topic` header accepts `order.created` or `customer.created`.

### `GET /api/webhooks/woocommerce`

Returns the customers held by the current in-memory server process.

### `POST /api/agent`

Accepts a customer object and returns a retention strategy, tool calls, execution trace, and source (`fallback` or `openai`).

## Testing

```bash
npm test
npm run build
```

## Project Structure

```text
src/
  app/
    api/agent/route.ts
    api/webhooks/woocommerce/route.ts
    customers/[id]/page.tsx
    page.tsx
    globals.css
  hooks/useCustomers.ts
  lib/
    agent-tools.ts
    crm-store.ts
    ltv.ts
    types.ts
    webhook-parser.ts
tests/webhook.test.ts
```

## Current MVP Limitations

Customer data and outreach logs are stored in memory and reset when the server restarts. External webhook events update the server store, but a persistent database and push-based browser refresh are not configured yet. The campaign buttons currently present generated copy and are ready to connect to an email provider.
