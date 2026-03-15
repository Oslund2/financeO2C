# financeO2C — Orders-to-Cash Automation Planning Tool

An interactive web application for mapping, analyzing, and presenting the automation potential of the Orders-to-Cash (O2C) workflow. Built for finance leadership meetings to show a clear path from manual AR/AP processes to AI-automated workflows using Wide Orbit data mirrored in Snowflake.

---

## What It Does

| Page | Purpose |
|------|---------|
| **Dashboard** | Key metrics — hours saved, FTE freed, net savings/year, ROI breakeven, AI insight cards |
| **Workflow Map** | Visual editor with 18 pre-seeded O2C steps across 7 phases. Edit, add, delete steps in real-time |
| **Savings Calculator** | Adjustable assumptions (FTE cost, volumes, AI cost) with live-recalculating ROI |
| **Scenario Modeler** | Toggle phases on/off, preset rollout scenarios, side-by-side comparison |
| **Presentation Mode** | 7-slide finance-meeting-ready presentation |
| **Data Explorer** | Snowflake data views (aging, agencies, disputes, payments) |
| **AI Demos** | Interactive simulations of dispute resolution, collections outreach, and cash application |

## O2C Phases Covered

1. **Order Entry & Validation** — Document parsing, rate card matching, auto-entry
2. **Traffic & Billing Handoff** — As-run reconciliation, missing affidavit detection
3. **Invoice Generation & Delivery** — Agency-specific formatting, automated delivery
4. **Aging & Collections Prioritization** — AI-weighted priority queues
5. **Collections Outreach** — Personalized notices referencing actual buys
6. **Dispute Resolution** — Instant evidence assembly from Snowflake
7. **Cash Application** — Probabilistic payment matching, short-pay detection

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Database**: Supabase (Postgres)
- **Data Source**: Snowflake (Wide Orbit mirror — read-only)
- **AI Engine**: Claude API (Anthropic)
- **Hosting**: Netlify

## Getting Started

```bash
npm install
npm run dev
```

## Environment Variables

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Deployment

Deployed via Netlify. Build settings:
- **Build command**: `npm ci && npm run build`
- **Publish directory**: `dist`
