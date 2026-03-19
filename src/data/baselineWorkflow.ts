import { WorkflowStep, O2CPhase } from '../types';

let idCounter = 0;
function makeId(): string {
  return `step-${++idCounter}`;
}

function step(
  phase: O2CPhase,
  order: number,
  name: string,
  description: string,
  manualMin: number,
  autoMin: number,
  freq: number,
  errManual: number,
  errAuto: number,
  aiCapability: string,
  dataSource: string,
  risk: 'low' | 'medium' | 'high',
  notes: string
): WorkflowStep {
  return {
    id: makeId(),
    phase,
    stepOrder: order,
    name,
    description,
    actor: 'human',
    manualTimeMinutes: manualMin,
    automatedTimeMinutes: autoMin,
    frequencyPerMonth: freq,
    errorRateManual: errManual,
    errorRateAutomated: errAuto,
    aiCapability,
    dataSource,
    riskLevel: risk,
    notes,
  };
}

export const MANUAL_BASELINE: WorkflowStep[] = [
  // Client Profile Setup (upstream of Order Entry)
  step('order_entry', 0, 'Client profile setup & data entry',
    'Receiving handwritten paper forms from salespeople, deciphering illegible handwriting, keying client profile data into WideOrbit. Includes error correction cycles. ~20/day, doubles at month-end.',
    25, 3, 440, 0.12, 0.008, 'Digital form + OCR + AI validation + dedup', 'Paper forms → WideOrbit', 'medium',
    'Mobile digital form replaces paper. Claude Vision reads photos of handwritten forms. AI validates and catches duplicates before submission.'),

  // Order Entry & Validation
  step('order_entry', 1, 'Receive order via email/fax/portal',
    'Orders arrive through multiple channels — email, fax-to-PDF, agency portals — each with inconsistent formatting.',
    5, 0.5, 4200, 0, 0, 'Document parsing & extraction', 'Wide Orbit Orders', 'low',
    'Claude reads incoming order documents and extracts line items automatically'),
  step('order_entry', 2, 'Key order into WideOrbit',
    'Manually entering order details including advertiser, agency, flight dates, spot lengths, dayparts, and rates.',
    12, 0.5, 4200, 0.042, 0.003, 'Auto-entry with validation', 'Wide Orbit Orders + Rate Cards', 'medium',
    'AI enters clean orders automatically, queues only exceptions for human review'),
  step('order_entry', 3, 'Validate against rate card & avails',
    'Cross-referencing ordered rates against current rate cards and checking daypart availability.',
    8, 1, 4200, 0.031, 0.005, 'Rate card matching & avail check', 'Snowflake: rate_cards, avails', 'high',
    'Claude matches against rate cards in Snowflake, flags discrepancies instantly'),

  // Traffic & Billing Handoff
  step('traffic_billing', 1, 'Reconcile aired spots vs. orders',
    'Comparing as-run logs against original orders to confirm what actually aired matches what was ordered.',
    15, 1, 3800, 0.028, 0.002, 'As-run reconciliation', 'Snowflake: as_run_logs, orders', 'high',
    'Continuous monitoring of Snowflake mirror for aired-but-unbilled orders'),
  step('traffic_billing', 2, 'Flag missing affidavits',
    'Identifying spots that aired but lack required proof-of-performance documentation.',
    10, 0.5, 600, 0.05, 0.005, 'Missing doc detection', 'Snowflake: affidavits, as_run_logs', 'medium',
    'AI scans for gaps between as-run and affidavit records automatically'),
  step('traffic_billing', 3, 'Generate billing records',
    'Creating billing entries for confirmed, reconciled spots ready for invoicing.',
    8, 0.5, 3800, 0.035, 0.003, 'Auto billing generation', 'Snowflake: confirmed_spots', 'high',
    'Auto-generates billing records for clean matches, routes mismatches to humans'),

  // Invoice Generation & Delivery
  step('invoice', 1, 'Format invoices per agency specs',
    'Each agency has different format requirements — some want CSV, some PDF, some need specific field layouts.',
    6, 0.5, 3200, 0.02, 0.002, 'Template-based generation', 'Snowflake: billing, agency_prefs', 'medium',
    'Claude personalizes invoice format per agency preference stored in data'),
  step('invoice', 2, 'Deliver via email/portal',
    'Sending completed invoices through the correct delivery channel for each agency.',
    3, 0.2, 3200, 0.015, 0.001, 'Automated delivery routing', 'Snowflake: agency_contacts', 'low',
    'Triggered automatically once invoice is generated and approved'),
  step('invoice', 3, 'Apply credit terms per client',
    'Looking up and applying correct net terms (Net 30, Net 60, etc.) for each client relationship.',
    4, 0.3, 3200, 0.025, 0.001, 'Terms lookup & application', 'Snowflake: contracts, credit_terms', 'high',
    'Cross-references credit terms per client automatically — no AR clerk needed'),

  // Aging & Collections Prioritization
  step('aging', 1, 'Run aging report',
    'Generating the standard AR aging report showing receivables by aging bucket (current, 30, 60, 90+ days).',
    20, 1, 30, 0.01, 0.001, 'Automated aging analysis', 'Snowflake: ar_aging', 'low',
    'Daily automated aging run against Snowflake receivables data'),
  step('aging', 2, 'Prioritize collections queue',
    'Manually reviewing the aging report and deciding which accounts to call first based on amount, relationship, and history.',
    45, 2, 30, 0, 0, 'AI-weighted prioritization', 'Snowflake: ar_aging, client_history, payments', 'medium',
    'Weighted by client value, pay history, and days outstanding — pre-prioritized queue each morning'),

  // Collections Outreach
  step('collections', 1, 'Draft & send first notice',
    'Writing and sending the initial collections communication for overdue accounts.',
    8, 1, 800, 0.01, 0.002, 'Personalized outreach drafting', 'Snowflake: invoices, spots, flights', 'medium',
    'References specific invoices, spot numbers, and flight dates from WideOrbit data'),
  step('collections', 2, 'Draft & send second notice',
    'Escalated follow-up communication with more urgency for accounts that didn\'t respond to first notice.',
    10, 1, 400, 0.015, 0.002, 'Escalation templating', 'Snowflake: invoices, aging, contact_log', 'medium',
    'Agencies respond faster when the email references their actual buys'),
  step('collections', 3, 'Escalation communications',
    'Final collections communications before accounts move to formal dispute or legal review.',
    15, 2, 100, 0.02, 0.005, 'Escalation drafting with context', 'Snowflake: full account history', 'high',
    'Human intervention kicks in only at formal dispute or legal escalation'),

  // Dispute Resolution
  step('disputes', 1, 'Research dispute details',
    'Pulling the original order, as-run log, contract terms, and invoice when an agency disputes a spot.',
    45, 1, 150, 0, 0, 'Instant evidence assembly', 'Snowflake: orders, as_runs, contracts, invoices', 'high',
    'What takes an AR rep 45 minutes of digging becomes a 60-second output'),
  step('disputes', 2, 'Compile evidence & respond',
    'Assembling supporting documentation and drafting a dispute response with findings.',
    30, 2, 150, 0, 0, 'Dispute summary generation', 'Snowflake: full order lifecycle', 'high',
    'Claude generates dispute summary with supporting evidence — rep reviews and approves'),

  // Cash Application
  step('cash_application', 1, 'Match payments to invoices',
    'Matching incoming payments to open invoices — especially complex when agencies pay in bulk or short-pay.',
    10, 0.5, 2800, 0.038, 0.004, 'Probabilistic payment matching', 'Snowflake: payments, open_ar', 'high',
    'Analyzes remittance data, matches probabilistically, auto-applies clean matches'),
  step('cash_application', 2, 'Research short-pays & unmatched',
    'Investigating payments that don\'t cleanly match — partial payments, bulk payments across multiple invoices, or unknown remittances.',
    20, 3, 500, 0, 0, 'Short-pay analysis & routing', 'Snowflake: payments, remittance_data, open_ar', 'high',
    'Flags short-pays and unmatched payments for human review — exception handling only'),
];

export function createAutomatedSteps(baseline: WorkflowStep[]): WorkflowStep[] {
  return baseline.map(s => ({
    ...s,
    id: `auto-${s.id}`,
    actor: s.riskLevel === 'high' ? 'hybrid' as const : 'ai' as const,
  }));
}
