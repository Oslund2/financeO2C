import { ArrowLeft } from 'lucide-react';
import { View } from './Layout';

interface HowItWorksProps {
  onNavigate: (view: View) => void;
}

export function HowItWorks({ onNavigate }: HowItWorksProps) {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-1 text-sm text-surface-500 hover:text-brand-600 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-surface-900">How It Works</h1>
        <p className="text-surface-500 mt-1">
          Architecture overview — how WideOrbit, Snowflake, and Claude AI work together to automate Orders-to-Cash
        </p>
      </div>

      {/* Architecture Diagram */}
      <div className="card p-6 overflow-x-auto">
        <h2 className="text-lg font-semibold text-surface-900 mb-6 text-center">System Architecture & Data Flow</h2>
        <ArchitectureDiagram />
      </div>

      {/* O2C Workflow with Human vs AI */}
      <div className="card p-6 overflow-x-auto">
        <h2 className="text-lg font-semibold text-surface-900 mb-2 text-center">Scripps O2C Workflow — Human vs. AI</h2>
        <p className="text-sm text-surface-500 text-center mb-6">Where the Scripps Orders-to-Cash team touches each step, and where Claude AI takes over</p>
        <WorkflowDiagram />
      </div>

      {/* Explanation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ExplainerCard
          color="#3b82f6"
          title="WideOrbit"
          subtitle="Source System"
          items={[
            'Broadcast traffic & billing system of record',
            'Orders, rate cards, as-run logs, contracts',
            'Invoicing, affidavits, agency preferences',
            'Production system — never touched by AI',
          ]}
        />
        <ExplainerCard
          color="#8b5cf6"
          title="Snowflake"
          subtitle="Read-Only Data Mirror"
          items={[
            'Real-time replica of WideOrbit production data',
            'Read-only access — AI can query, never modify',
            'Tables: orders, invoices, ar_aging, payments, contracts, as_run_logs, rate_cards',
            'The safety buffer between AI and live systems',
          ]}
        />
        <ExplainerCard
          color="#10b981"
          title="Claude AI"
          subtitle="Intelligent Automation Layer"
          items={[
            'Natural language queries against Snowflake data',
            'Dispute research & evidence assembly',
            'Collections outreach drafting with real data',
            'Payment matching, reconciliation, anomaly detection',
          ]}
        />
      </div>

      {/* The Structural Shift */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-surface-900 mb-4">The Structural Shift</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              Today: Scripps Team Does the Work
            </h3>
            <div className="space-y-2">
              {[
                'Manually key orders into WideOrbit from emails/faxes',
                'Pull up each invoice, order, and as-run log to research disputes',
                'Write collections emails from scratch, looking up each invoice',
                'Run aging report, scroll through it, decide who to call first',
                'Match payments to invoices by hand — detective work on bulk payments',
                'Reconcile aired spots vs. orders in spreadsheets',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-red-400 mt-1 flex-shrink-0">--</span>
                  <span className="text-surface-600">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-emerald-600 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              Future: Scripps Team Approves the Work
            </h3>
            <div className="space-y-2">
              {[
                'Claude reads incoming orders and auto-enters clean ones; team reviews exceptions',
                'Claude assembles all evidence in 60 seconds; team reviews and approves resolution',
                'Claude drafts personalized emails with real invoice data; team clicks send',
                'Claude pre-ranks collections queue by risk score each morning; team works the list',
                'Claude matches 90%+ of payments automatically; team handles the exceptions',
                'Claude runs daily reconciliation and surfaces only the mismatches',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-emerald-400 mt-1 flex-shrink-0">--</span>
                  <span className="text-surface-600">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Data Fidelity */}
      <div className="card p-6 bg-surface-50">
        <h2 className="text-lg font-semibold text-surface-900 mb-3">Data Fidelity Guarantee</h2>
        <p className="text-sm text-surface-600 mb-4">
          The entire architecture is designed so that AI never touches production data and every action has a human gate:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'WideOrbit', detail: 'AI never connects to production. All queries go through the Snowflake read-only mirror.' },
            { label: 'Snowflake', detail: 'Service account has SELECT-only permissions. No INSERT, UPDATE, or DELETE access.' },
            { label: 'Claude AI', detail: 'Every AI-generated output (emails, resolutions, matches) is presented for human approval before action.' },
            { label: 'Audit Trail', detail: 'Every query, every draft, every recommendation is logged with timestamp and source data references.' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-lg p-4 border border-surface-200">
              <div className="font-semibold text-surface-900 text-sm mb-1">{item.label}</div>
              <div className="text-xs text-surface-500">{item.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Architecture Diagram (SVG)
// ---------------------------------------------------------------------------
function ArchitectureDiagram() {
  return (
    <svg viewBox="0 0 960 420" className="w-full max-w-4xl mx-auto" style={{ minWidth: 700 }}>
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
        </marker>
        <marker id="arrow-blue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
        </marker>
        <marker id="arrow-green" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
        </marker>
        <marker id="arrow-purple" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#8b5cf6" />
        </marker>
        <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* === WideOrbit Box === */}
      <g>
        <rect x="20" y="140" width="200" height="140" rx="16" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" filter="url(#shadow)" />
        <rect x="20" y="140" width="200" height="36" rx="16" fill="#3b82f6" />
        <rect x="20" y="158" width="200" height="18" fill="#3b82f6" />
        <text x="120" y="164" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">WideOrbit</text>
        <text x="120" y="200" textAnchor="middle" fill="#1e40af" fontSize="11" fontWeight="500">Production System</text>
        <text x="120" y="218" textAnchor="middle" fill="#64748b" fontSize="10">Orders &amp; Traffic</text>
        <text x="120" y="233" textAnchor="middle" fill="#64748b" fontSize="10">Billing &amp; Invoicing</text>
        <text x="120" y="248" textAnchor="middle" fill="#64748b" fontSize="10">Rate Cards &amp; Contracts</text>
        <text x="120" y="263" textAnchor="middle" fill="#64748b" fontSize="10">As-Run Logs</text>
      </g>

      {/* === Arrow: WideOrbit → Snowflake === */}
      <line x1="220" y1="210" x2="295" y2="210" stroke="#3b82f6" strokeWidth="2.5" markerEnd="url(#arrow-blue)" strokeDasharray="6 3" />
      <text x="258" y="198" textAnchor="middle" fill="#3b82f6" fontSize="9" fontWeight="600">REPLICATE</text>

      {/* === Snowflake Box === */}
      <g>
        <rect x="300" y="110" width="220" height="200" rx="16" fill="#f5f3ff" stroke="#8b5cf6" strokeWidth="2" filter="url(#shadow)" />
        <rect x="300" y="110" width="220" height="36" rx="16" fill="#8b5cf6" />
        <rect x="300" y="128" width="220" height="18" fill="#8b5cf6" />
        <text x="410" y="134" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">Snowflake</text>
        <text x="410" y="166" textAnchor="middle" fill="#5b21b6" fontSize="11" fontWeight="500">Read-Only Data Mirror</text>
        <text x="410" y="188" textAnchor="middle" fill="#64748b" fontSize="10">orders &middot; invoices &middot; ar_aging</text>
        <text x="410" y="203" textAnchor="middle" fill="#64748b" fontSize="10">payments &middot; as_run_logs</text>
        <text x="410" y="218" textAnchor="middle" fill="#64748b" fontSize="10">rate_cards &middot; contracts</text>
        <text x="410" y="233" textAnchor="middle" fill="#64748b" fontSize="10">affidavits &middot; remittance_data</text>
        <text x="410" y="248" textAnchor="middle" fill="#64748b" fontSize="10">agency_contacts &middot; credit_terms</text>
        {/* Lock icon indication */}
        <text x="410" y="272" textAnchor="middle" fill="#8b5cf6" fontSize="10" fontWeight="600">SELECT only &middot; No writes</text>
        <text x="410" y="290" textAnchor="middle" fill="#8b5cf6" fontSize="9">Service account: read-only</text>
      </g>

      {/* === Arrow: Snowflake → Claude === */}
      <line x1="520" y1="210" x2="595" y2="210" stroke="#8b5cf6" strokeWidth="2.5" markerEnd="url(#arrow-purple)" />
      <text x="558" y="198" textAnchor="middle" fill="#8b5cf6" fontSize="9" fontWeight="600">QUERY</text>

      {/* === Claude AI Box === */}
      <g>
        <rect x="600" y="120" width="220" height="180" rx="16" fill="#ecfdf5" stroke="#10b981" strokeWidth="2" filter="url(#shadow)" />
        <rect x="600" y="120" width="220" height="36" rx="16" fill="#10b981" />
        <rect x="600" y="138" width="220" height="18" fill="#10b981" />
        <text x="710" y="144" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">Claude AI</text>
        <text x="710" y="176" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="500">Intelligent Automation</text>
        <text x="710" y="198" textAnchor="middle" fill="#64748b" fontSize="10">NL Queries &amp; Data Analysis</text>
        <text x="710" y="213" textAnchor="middle" fill="#64748b" fontSize="10">Dispute Evidence Assembly</text>
        <text x="710" y="228" textAnchor="middle" fill="#64748b" fontSize="10">Collections Email Drafting</text>
        <text x="710" y="243" textAnchor="middle" fill="#64748b" fontSize="10">Payment Matching (90%+ auto)</text>
        <text x="710" y="258" textAnchor="middle" fill="#64748b" fontSize="10">Reconciliation &amp; Anomaly Detection</text>
        <text x="710" y="278" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="600">Drafts &middot; Never acts alone</text>
      </g>

      {/* === Scripps O2C Team Box === */}
      <g>
        <rect x="660" y="340" width="280" height="70" rx="16" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" filter="url(#shadow)" />
        <text x="800" y="370" textAnchor="middle" fill="#92400e" fontSize="14" fontWeight="700">Scripps Orders-to-Cash Team</text>
        <text x="800" y="390" textAnchor="middle" fill="#78716c" fontSize="11">Reviews &middot; Approves &middot; Handles Exceptions</text>
      </g>

      {/* === Arrow: Claude ↔ Scripps Team === */}
      <line x1="740" y1="300" x2="780" y2="338" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrow)" />
      <text x="730" y="320" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="600">DRAFTS &amp;</text>
      <text x="730" y="331" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="600">RECOMMENDATIONS</text>
      <line x1="820" y1="338" x2="780" y2="300" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow-green)" />
      <text x="850" y="320" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="600">APPROVE</text>
      <text x="850" y="331" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="600">&amp; SEND</text>

      {/* === Arrow: Scripps Team → WideOrbit (actions) === */}
      <path d="M 660 380 C 400 420, 200 380, 120 282" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 3" markerEnd="url(#arrow)" />
      <text x="380" y="408" textAnchor="middle" fill="#92400e" fontSize="9" fontWeight="500">Final actions posted back to WideOrbit by team</text>

      {/* === Top labels === */}
      <text x="120" y="120" textAnchor="middle" fill="#3b82f6" fontSize="10" fontWeight="600" opacity="0.7">SOURCE OF TRUTH</text>
      <text x="410" y="92" textAnchor="middle" fill="#8b5cf6" fontSize="10" fontWeight="600" opacity="0.7">SAFE QUERY LAYER</text>
      <text x="710" y="102" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="600" opacity="0.7">AI ENGINE</text>

      {/* === Security callout === */}
      <rect x="250" y="10" width="460" height="55" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="1" filter="url(#shadow)" />
      <text x="480" y="32" textAnchor="middle" fill="#1e293b" fontSize="12" fontWeight="700">Data flows one direction: WideOrbit → Snowflake → Claude → Scripps Team</text>
      <text x="480" y="50" textAnchor="middle" fill="#64748b" fontSize="10">AI never writes back to production. The team is always the final authority.</text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Workflow Diagram — 7 phases, showing Human / AI / Hybrid
// ---------------------------------------------------------------------------
function WorkflowDiagram() {
  const phases = [
    {
      name: 'Order Entry',
      color: '#3b82f6',
      steps: [
        { label: 'Receive orders', who: 'ai', detail: 'Claude parses email/fax/portal orders' },
        { label: 'Key into WideOrbit', who: 'hybrid', detail: 'AI auto-enters clean orders; team reviews exceptions' },
        { label: 'Validate rates & avails', who: 'hybrid', detail: 'AI checks rate cards; team approves overrides' },
      ],
    },
    {
      name: 'Traffic & Billing',
      color: '#8b5cf6',
      steps: [
        { label: 'Reconcile aired vs. ordered', who: 'ai', detail: 'Daily automated scan of Snowflake mirror' },
        { label: 'Flag missing affidavits', who: 'ai', detail: 'AI detects gaps; team uploads docs' },
        { label: 'Generate billing records', who: 'hybrid', detail: 'Auto-generate for clean matches; team handles mismatches' },
      ],
    },
    {
      name: 'Invoicing',
      color: '#06b6d4',
      steps: [
        { label: 'Format per agency specs', who: 'ai', detail: 'Auto-personalized from agency preferences' },
        { label: 'Deliver via email/portal', who: 'ai', detail: 'Triggered on approval' },
        { label: 'Apply credit terms', who: 'ai', detail: 'Auto-lookup from contracts in Snowflake' },
      ],
    },
    {
      name: 'Aging & Prioritization',
      color: '#f59e0b',
      steps: [
        { label: 'Run aging report', who: 'ai', detail: 'Daily automated run against Snowflake' },
        { label: 'Prioritize collections queue', who: 'hybrid', detail: 'AI ranks by risk score; team adjusts priorities' },
      ],
    },
    {
      name: 'Collections',
      color: '#ef4444',
      steps: [
        { label: '1st notice', who: 'hybrid', detail: 'AI drafts with real invoice data; team sends' },
        { label: '2nd notice', who: 'hybrid', detail: 'AI escalates language; team reviews tone' },
        { label: 'Escalation', who: 'human', detail: 'Scripps team handles legal/formal escalation' },
      ],
    },
    {
      name: 'Disputes',
      color: '#ec4899',
      steps: [
        { label: 'Research dispute', who: 'ai', detail: 'Claude assembles all evidence in ~60 seconds' },
        { label: 'Compile & respond', who: 'hybrid', detail: 'AI drafts resolution; team approves and sends' },
      ],
    },
    {
      name: 'Cash Application',
      color: '#10b981',
      steps: [
        { label: 'Match payments', who: 'hybrid', detail: 'AI auto-matches 90%+; team reviews low-confidence' },
        { label: 'Research short-pays', who: 'hybrid', detail: 'AI identifies likely causes; team decides resolution' },
      ],
    },
  ];

  const whoColors: Record<string, { bg: string; text: string; label: string }> = {
    ai: { bg: '#ecfdf5', text: '#065f46', label: 'AI Handles' },
    hybrid: { bg: '#fef3c7', text: '#92400e', label: 'AI + Team' },
    human: { bg: '#fef2f2', text: '#991b1b', label: 'Team Leads' },
  };

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mb-6">
        {Object.entries(whoColors).map(([key, { bg, text, label }]) => (
          <div key={key} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: bg, border: `1.5px solid ${text}` }} />
            <span className="text-xs font-medium" style={{ color: text }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Phase flow */}
      <div className="flex flex-col gap-4">
        {phases.map((phase, pi) => (
          <div key={pi} className="flex items-stretch gap-0">
            {/* Phase label */}
            <div
              className="flex items-center justify-center rounded-l-xl px-4 py-3 min-w-[160px]"
              style={{ backgroundColor: phase.color + '15', borderLeft: `4px solid ${phase.color}` }}
            >
              <span className="text-sm font-semibold" style={{ color: phase.color }}>{phase.name}</span>
            </div>

            {/* Steps */}
            <div className="flex-1 flex gap-2 py-1">
              {phase.steps.map((step, si) => {
                const { bg, text, label } = whoColors[step.who];
                return (
                  <div
                    key={si}
                    className="flex-1 rounded-lg p-3 border transition-all hover:shadow-md"
                    style={{ backgroundColor: bg, borderColor: text + '40' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold" style={{ color: text }}>{step.label}</span>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: text + '15', color: text }}
                      >
                        {label}
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug" style={{ color: text + 'cc' }}>
                      {step.detail}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Arrow to next phase */}
            {pi < phases.length - 1 && (
              <div className="flex items-center px-1 text-surface-300">
                <svg width="16" height="24" viewBox="0 0 16 24"><path d="M4 4 L12 12 L4 20" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary bar */}
      <div className="mt-6 p-4 rounded-xl bg-surface-50 border border-surface-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-600">11</div>
            <div className="text-xs text-surface-500">Steps AI handles or leads</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">7</div>
            <div className="text-xs text-surface-500">Steps AI + Scripps team collaborate</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">1</div>
            <div className="text-xs text-surface-500">Step team handles alone (escalation)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Explainer Card
// ---------------------------------------------------------------------------
function ExplainerCard({ color, title, subtitle, items }: {
  color: string; title: string; subtitle: string; items: string[];
}) {
  return (
    <div className="card p-5 border-t-4" style={{ borderTopColor: color }}>
      <h3 className="font-bold text-surface-900 text-lg">{title}</h3>
      <p className="text-sm font-medium mb-3" style={{ color }}>{subtitle}</p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-surface-600">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
