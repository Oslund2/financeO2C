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
          Architecture overview — how WideOrbit, Snowflake, Crispin, TMS, and Claude AI work together to automate Orders-to-Cash
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

      {/* System Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ExplainerCard
          color="#3b82f6"
          title="WideOrbit"
          subtitle="Source System + WO Payments Suite"
          items={[
            'Broadcast traffic & billing system of record',
            'Orders, rate cards, as-run logs, contracts',
            'WO Payments Suite: ACH/CC payments, dunning, buyer portal (80K+ buyers)',
            'Client/advertiser profile management',
            'Aging reports drive collections workflow',
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
            'Profile OCR: reads handwritten paper forms via photo',
            'NL queries against Snowflake data',
            'Dispute research & evidence assembly',
            'Collections outreach drafting with real data',
            'Payment matching, reconciliation, anomaly detection',
            'Auto-surfaces irreconcilables from log reconciliation',
          ]}
        />
        <ExplainerCard
          color="#f97316"
          title="Crispin / Playout"
          subtitle="Broadcast Automation"
          items={[
            'Master control automation for on-air playout',
            'Generates as-run logs (what actually aired)',
            'Produces late run reports when spots air outside scheduled window',
            'Late run reports emailed to station, parsed by macro → TMS',
          ]}
        />
        <ExplainerCard
          color="#6366f1"
          title="TMS"
          subtitle="Home-Built Orchestration Layer"
          items={[
            'Orchestration layer between traffic and playout systems',
            'Transaction backup and history',
            'Log reconciliation: traffic schedule vs. Crispin as-run',
            'Candidate for Claude Code refactor — add AI-powered matching',
          ]}
        />
        <ExplainerCard
          color="#ec4899"
          title="Client Intake"
          subtitle="Digital Profile Setup (New)"
          items={[
            'Mobile-first form replaces handwritten paper',
            'Claude Vision reads photos of paper forms (OCR)',
            'AI validation + deduplication before WideOrbit entry',
            'Client self-service links — they type their own data',
            'Saves ~20 min per profile, 440 profiles/month',
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
                'Decipher handwritten paper forms, key client profiles into WideOrbit (~25 min each, 20/day)',
                'Manually key orders into WideOrbit from emails/faxes',
                'Hunt for irreconcilables between traffic logs and Crispin as-run data',
                'Parse late run reports from email, manually process makegoods',
                'Pull aging reports from WideOrbit, manually create and send dunning notices',
                'Pull up each invoice, order, and as-run log to research disputes',
                'Write collections emails from scratch, looking up each invoice',
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
                'Salespeople fill mobile form (or client fills their own); AI validates and deduplicates',
                'Claude reads incoming orders and auto-enters clean ones; team reviews exceptions',
                'Claude auto-surfaces irreconcilables — team only sees the mismatches, not the 95% that match',
                'Late run reports parsed automatically; AI generates makegood offers for review',
                'Aging reports run daily via Snowflake; AI auto-generates and sends dunning notices per WO Payments Suite rules',
                'Claude assembles all dispute evidence in 60 seconds; team reviews and approves',
                'Claude drafts personalized emails with real invoice data; team clicks send',
                'Claude matches 90%+ of payments automatically; team handles the exceptions',
                'Claude runs daily reconciliation and surfaces only the anomalies',
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
// Architecture Diagram (SVG) — expanded with TMS, Crispin, Client Intake
// ---------------------------------------------------------------------------
function ArchitectureDiagram() {
  return (
    <svg viewBox="0 0 980 580" className="w-full max-w-5xl mx-auto" style={{ minWidth: 750 }}>
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
        <marker id="arrow-orange" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#f97316" />
        </marker>
        <marker id="arrow-pink" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#ec4899" />
        </marker>
        <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* === Security callout === */}
      <rect x="200" y="5" width="580" height="48" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="1" filter="url(#shadow)" />
      <text x="490" y="25" textAnchor="middle" fill="#1e293b" fontSize="11" fontWeight="700">Data flows one direction: Source Systems → Snowflake → Claude AI → Scripps Team → WideOrbit</text>
      <text x="490" y="42" textAnchor="middle" fill="#64748b" fontSize="9">AI never writes to production. The team is always the final authority.</text>

      {/* === CLIENT INTAKE (top-left) === */}
      <g>
        <rect x="15" y="70" width="175" height="110" rx="14" fill="#fdf2f8" stroke="#ec4899" strokeWidth="2" filter="url(#shadow)" />
        <rect x="15" y="70" width="175" height="30" rx="14" fill="#ec4899" />
        <rect x="15" y="86" width="175" height="14" fill="#ec4899" />
        <text x="103" y="91" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">Client Intake</text>
        <text x="103" y="114" textAnchor="middle" fill="#9d174d" fontSize="9" fontWeight="500">Mobile Digital Form</text>
        <text x="103" y="128" textAnchor="middle" fill="#64748b" fontSize="8">Photo OCR (Claude Vision)</text>
        <text x="103" y="140" textAnchor="middle" fill="#64748b" fontSize="8">AI Validation + Dedup</text>
        <text x="103" y="152" textAnchor="middle" fill="#64748b" fontSize="8">Client Self-Service Links</text>
        <text x="103" y="166" textAnchor="middle" fill="#ec4899" fontSize="8" fontWeight="600">Replaces paper forms</text>
      </g>

      {/* Arrow: Client Intake → WideOrbit */}
      <line x1="190" y1="145" x2="230" y2="200" stroke="#ec4899" strokeWidth="1.5" markerEnd="url(#arrow-pink)" />
      <text x="225" y="168" textAnchor="middle" fill="#ec4899" fontSize="8" fontWeight="500">CLEAN</text>
      <text x="225" y="177" textAnchor="middle" fill="#ec4899" fontSize="8" fontWeight="500">DATA</text>

      {/* === CRISPIN / PLAYOUT (top-right) === */}
      <g>
        <rect x="15" y="330" width="175" height="110" rx="14" fill="#fff7ed" stroke="#f97316" strokeWidth="2" filter="url(#shadow)" />
        <rect x="15" y="330" width="175" height="30" rx="14" fill="#f97316" />
        <rect x="15" y="346" width="175" height="14" fill="#f97316" />
        <text x="103" y="351" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">Crispin / Playout</text>
        <text x="103" y="374" textAnchor="middle" fill="#9a3412" fontSize="9" fontWeight="500">Broadcast Automation</text>
        <text x="103" y="388" textAnchor="middle" fill="#64748b" fontSize="8">As-Run Logs (what aired)</text>
        <text x="103" y="400" textAnchor="middle" fill="#64748b" fontSize="8">Late Run Reports</text>
        <text x="103" y="412" textAnchor="middle" fill="#64748b" fontSize="8">Makegood triggers</text>
        <text x="103" y="426" textAnchor="middle" fill="#f97316" fontSize="8" fontWeight="600">Emailed → Macro → TMS</text>
      </g>

      {/* === TMS (between Crispin and WideOrbit) === */}
      <g>
        <rect x="15" y="460" width="175" height="100" rx="14" fill="#eef2ff" stroke="#6366f1" strokeWidth="2" filter="url(#shadow)" />
        <rect x="15" y="460" width="175" height="30" rx="14" fill="#6366f1" />
        <rect x="15" y="476" width="175" height="14" fill="#6366f1" />
        <text x="103" y="481" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">TMS (Home-Built)</text>
        <text x="103" y="504" textAnchor="middle" fill="#3730a3" fontSize="9" fontWeight="500">Orchestration Layer</text>
        <text x="103" y="518" textAnchor="middle" fill="#64748b" fontSize="8">Log reconciliation</text>
        <text x="103" y="530" textAnchor="middle" fill="#64748b" fontSize="8">Transaction backup &amp; history</text>
        <text x="103" y="546" textAnchor="middle" fill="#6366f1" fontSize="8" fontWeight="600">Refactor candidate</text>
      </g>

      {/* Arrow: Crispin → TMS */}
      <line x1="103" y1="440" x2="103" y2="458" stroke="#f97316" strokeWidth="1.5" markerEnd="url(#arrow-orange)" />
      <text x="130" y="452" fill="#f97316" fontSize="7" fontWeight="500">AS-RUN</text>

      {/* Arrow: TMS → WideOrbit */}
      <line x1="190" y1="500" x2="230" y2="280" stroke="#6366f1" strokeWidth="1.5" markerEnd="url(#arrow)" strokeDasharray="4 3" />

      {/* === WideOrbit Box === */}
      <g>
        <rect x="230" y="180" width="210" height="170" rx="16" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" filter="url(#shadow)" />
        <rect x="230" y="180" width="210" height="34" rx="16" fill="#3b82f6" />
        <rect x="230" y="198" width="210" height="16" fill="#3b82f6" />
        <text x="335" y="202" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">WideOrbit</text>
        <text x="335" y="232" textAnchor="middle" fill="#1e40af" fontSize="10" fontWeight="500">Production System</text>
        <text x="335" y="248" textAnchor="middle" fill="#64748b" fontSize="9">Orders &amp; Traffic</text>
        <text x="335" y="261" textAnchor="middle" fill="#64748b" fontSize="9">Billing &amp; Invoicing</text>
        <text x="335" y="274" textAnchor="middle" fill="#64748b" fontSize="9">Rate Cards &amp; Contracts</text>
        <text x="335" y="287" textAnchor="middle" fill="#64748b" fontSize="9">Client Profiles</text>
        <text x="335" y="304" textAnchor="middle" fill="#3b82f6" fontSize="9" fontWeight="600">WO Payments Suite</text>
        <text x="335" y="316" textAnchor="middle" fill="#64748b" fontSize="8">Dunning &middot; Buyer Portal &middot; ACH/CC</text>
        <text x="335" y="330" textAnchor="middle" fill="#64748b" fontSize="8">Aging Reports &middot; Payment Requests</text>
      </g>
      <text x="335" y="170" textAnchor="middle" fill="#3b82f6" fontSize="9" fontWeight="600" opacity="0.7">SOURCE OF TRUTH</text>

      {/* === Arrow: WideOrbit → Snowflake === */}
      <line x1="440" y1="265" x2="498" y2="265" stroke="#3b82f6" strokeWidth="2.5" markerEnd="url(#arrow-blue)" strokeDasharray="6 3" />
      <text x="470" y="255" textAnchor="middle" fill="#3b82f6" fontSize="8" fontWeight="600">REPLICATE</text>

      {/* === Snowflake Box === */}
      <g>
        <rect x="500" y="170" width="200" height="190" rx="16" fill="#f5f3ff" stroke="#8b5cf6" strokeWidth="2" filter="url(#shadow)" />
        <rect x="500" y="170" width="200" height="34" rx="16" fill="#8b5cf6" />
        <rect x="500" y="188" width="200" height="16" fill="#8b5cf6" />
        <text x="600" y="192" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">Snowflake</text>
        <text x="600" y="222" textAnchor="middle" fill="#5b21b6" fontSize="10" fontWeight="500">Read-Only Mirror</text>
        <text x="600" y="240" textAnchor="middle" fill="#64748b" fontSize="9">orders &middot; invoices &middot; ar_aging</text>
        <text x="600" y="253" textAnchor="middle" fill="#64748b" fontSize="9">payments &middot; as_run_logs</text>
        <text x="600" y="266" textAnchor="middle" fill="#64748b" fontSize="9">rate_cards &middot; contracts</text>
        <text x="600" y="279" textAnchor="middle" fill="#64748b" fontSize="9">affidavits &middot; remittance_data</text>
        <text x="600" y="292" textAnchor="middle" fill="#64748b" fontSize="9">client_profiles &middot; credit_terms</text>
        <text x="600" y="312" textAnchor="middle" fill="#8b5cf6" fontSize="9" fontWeight="600">SELECT only &middot; No writes</text>
        <text x="600" y="328" textAnchor="middle" fill="#8b5cf6" fontSize="8">+ Claude Snowflake Connector</text>
      </g>
      <text x="600" y="160" textAnchor="middle" fill="#8b5cf6" fontSize="9" fontWeight="600" opacity="0.7">SAFE QUERY LAYER</text>

      {/* === Arrow: Snowflake → Claude === */}
      <line x1="700" y1="265" x2="748" y2="265" stroke="#8b5cf6" strokeWidth="2.5" markerEnd="url(#arrow-purple)" />
      <text x="725" y="255" textAnchor="middle" fill="#8b5cf6" fontSize="8" fontWeight="600">QUERY</text>

      {/* === Claude AI Box === */}
      <g>
        <rect x="750" y="155" width="215" height="220" rx="16" fill="#ecfdf5" stroke="#10b981" strokeWidth="2" filter="url(#shadow)" />
        <rect x="750" y="155" width="215" height="34" rx="16" fill="#10b981" />
        <rect x="750" y="173" width="215" height="16" fill="#10b981" />
        <text x="858" y="177" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">Claude AI</text>
        <text x="858" y="207" textAnchor="middle" fill="#065f46" fontSize="10" fontWeight="500">Intelligent Automation</text>
        <text x="858" y="225" textAnchor="middle" fill="#64748b" fontSize="9">Profile OCR (Vision)</text>
        <text x="858" y="238" textAnchor="middle" fill="#64748b" fontSize="9">NL Queries &amp; Data Analysis</text>
        <text x="858" y="251" textAnchor="middle" fill="#64748b" fontSize="9">Dispute Evidence Assembly</text>
        <text x="858" y="264" textAnchor="middle" fill="#64748b" fontSize="9">Collections &amp; Dunning Drafts</text>
        <text x="858" y="277" textAnchor="middle" fill="#64748b" fontSize="9">Payment Matching (90%+ auto)</text>
        <text x="858" y="290" textAnchor="middle" fill="#64748b" fontSize="9">Log Reconciliation &amp; Late Run Detection</text>
        <text x="858" y="303" textAnchor="middle" fill="#64748b" fontSize="9">Auto-Surface Irreconcilables</text>
        <text x="858" y="320" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="600">Dedup &middot; Validate &middot; Draft</text>
        <text x="858" y="335" textAnchor="middle" fill="#10b981" fontSize="8" fontWeight="500">Never acts alone</text>
      </g>
      <text x="858" y="145" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="600" opacity="0.7">AI ENGINE</text>

      {/* === Scripps O2C Team Box === */}
      <g>
        <rect x="680" y="420" width="285" height="70" rx="16" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" filter="url(#shadow)" />
        <text x="823" y="450" textAnchor="middle" fill="#92400e" fontSize="13" fontWeight="700">Scripps Orders-to-Cash Team</text>
        <text x="823" y="470" textAnchor="middle" fill="#78716c" fontSize="10">Reviews &middot; Approves &middot; Handles Exceptions &middot; Sends</text>
      </g>

      {/* === Arrow: Claude ↔ Scripps Team === */}
      <line x1="810" y1="375" x2="810" y2="418" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrow)" />
      <text x="785" y="398" textAnchor="end" fill="#f59e0b" fontSize="8" fontWeight="600">DRAFTS &amp; RECS</text>
      <line x1="860" y1="418" x2="860" y2="375" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow-green)" />
      <text x="885" y="398" fill="#10b981" fontSize="8" fontWeight="600">APPROVE</text>

      {/* === Arrow: Scripps Team → WideOrbit === */}
      <path d="M 680 460 C 500 510, 380 430, 335 352" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 3" markerEnd="url(#arrow)" />
      <text x="490" y="485" textAnchor="middle" fill="#92400e" fontSize="8" fontWeight="500">Final actions posted to WideOrbit by team</text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Workflow Diagram — 8 phases (added Client Intake), showing Human / AI / Hybrid
// ---------------------------------------------------------------------------
function WorkflowDiagram() {
  const phases = [
    {
      name: 'Client Intake',
      color: '#ec4899',
      steps: [
        { label: 'Paper form → digital', who: 'ai', detail: 'Mobile form or Claude Vision OCR reads handwritten paper' },
        { label: 'AI validate + dedup', who: 'ai', detail: 'Catches errors, flags duplicates by Tax ID & name' },
        { label: 'Push to WideOrbit', who: 'hybrid', detail: 'Team reviews validated profile, pushes clean data' },
      ],
    },
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
        { label: 'Reconcile aired vs. ordered', who: 'ai', detail: 'Auto-compare traffic log vs. Crispin as-run' },
        { label: 'Surface late runs', who: 'ai', detail: 'AI flags spots aired outside scheduled window' },
        { label: 'Flag irreconcilables', who: 'ai', detail: 'Auto-surfaces mismatches — humans don\'t hunt' },
        { label: 'Generate billing', who: 'hybrid', detail: 'Auto-generate for clean; team handles exceptions' },
      ],
    },
    {
      name: 'Invoicing',
      color: '#06b6d4',
      steps: [
        { label: 'Format per agency', who: 'ai', detail: 'Auto-personalized from agency preferences' },
        { label: 'Deliver via portal', who: 'ai', detail: 'Triggered on approval, via WO Payments Suite' },
        { label: 'Apply credit terms', who: 'ai', detail: 'Auto-lookup from contracts in Snowflake' },
      ],
    },
    {
      name: 'Aging & Dunning',
      color: '#f59e0b',
      steps: [
        { label: 'Run aging report', who: 'ai', detail: 'Daily auto-run via Snowflake, not manual WO pull' },
        { label: 'Generate dunning notices', who: 'hybrid', detail: 'AI drafts per WO Payments Suite rules; team sends' },
        { label: 'Prioritize collections', who: 'hybrid', detail: 'AI ranks by risk score; team works the list' },
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

  const aiCount = phases.flatMap(p => p.steps).filter(s => s.who === 'ai').length;
  const hybridCount = phases.flatMap(p => p.steps).filter(s => s.who === 'hybrid').length;
  const humanCount = phases.flatMap(p => p.steps).filter(s => s.who === 'human').length;

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
      <div className="flex flex-col gap-3">
        {phases.map((phase, pi) => (
          <div key={pi} className="flex items-stretch gap-0">
            <div
              className="flex items-center justify-center rounded-l-xl px-3 py-2 min-w-[140px]"
              style={{ backgroundColor: phase.color + '15', borderLeft: `4px solid ${phase.color}` }}
            >
              <span className="text-xs font-semibold" style={{ color: phase.color }}>{phase.name}</span>
            </div>
            <div className="flex-1 flex gap-1.5 py-1">
              {phase.steps.map((step, si) => {
                const { bg, text, label } = whoColors[step.who];
                return (
                  <div
                    key={si}
                    className="flex-1 rounded-lg p-2.5 border transition-all hover:shadow-md"
                    style={{ backgroundColor: bg, borderColor: text + '40' }}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] font-bold" style={{ color: text }}>{step.label}</span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: text + '15', color: text }}>
                        {label}
                      </span>
                    </div>
                    <p className="text-[10px] leading-snug" style={{ color: text + 'cc' }}>{step.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary bar */}
      <div className="mt-6 p-4 rounded-xl bg-surface-50 border border-surface-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-600">{aiCount}</div>
            <div className="text-xs text-surface-500">Steps AI handles or leads</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">{hybridCount}</div>
            <div className="text-xs text-surface-500">Steps AI + Scripps team collaborate</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{humanCount}</div>
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
