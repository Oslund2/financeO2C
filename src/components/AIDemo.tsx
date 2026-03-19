import { useState } from 'react';
import { Sparkles, FileSearch, Mail, Banknote, Clock, CheckCircle2, ArrowRight, Loader2, Wifi, WifiOff, ArrowLeft, ClipboardCheck, ScanSearch } from 'lucide-react';
import { resolveDispute, draftCollectionsEmail, analyzeCashMatch, verifyAPInvoice, scanDiscrepancies } from '../lib/claude';
import { INVOICES, PAYMENTS, RECONCILIATION } from '../data/syntheticData';
import { View } from './Layout';

type DemoType = 'dispute' | 'collections' | 'cash_match' | 'ap_verify' | 'discrepancy_scan';
type DemoTier = 'immediate' | 'medium' | 'bigger';

interface Demo {
  type: DemoType;
  tier: DemoTier;
  icon: typeof FileSearch;
  title: string;
  description: string;
  manualTime: string;
  aiTime: string;
}

const DEMOS: Demo[] = [
  // Immediate wins
  {
    type: 'dispute', tier: 'immediate', icon: FileSearch,
    title: 'Dispute Resolution',
    description: 'Watch AI pull the original order, as-run log, contract terms, and invoice from Snowflake and generate a complete dispute summary with supporting evidence.',
    manualTime: '45 min research + 30 min compile', aiTime: '~60 seconds',
  },
  {
    type: 'collections', tier: 'immediate', icon: Mail,
    title: 'Collections Outreach',
    description: 'See AI draft a personalized collections email that references specific invoices, spot numbers, and flight dates from WideOrbit data.',
    manualTime: '8-10 min per notice', aiTime: '~15 seconds',
  },
  // Medium-term
  {
    type: 'cash_match', tier: 'medium', icon: Banknote,
    title: 'Cash Application',
    description: 'Watch AI analyze a bulk payment, probabilistically match it against open AR, and identify a short-pay with the specific invoices involved.',
    manualTime: '10-20 min per payment', aiTime: '~30 seconds',
  },
  {
    type: 'ap_verify', tier: 'medium', icon: ClipboardCheck,
    title: 'AP Invoice Verification',
    description: 'See AI cross-reference an incoming vendor invoice against contracted rates, ordered spot counts, and payment terms — flagging discrepancies instantly.',
    manualTime: '15-25 min per invoice', aiTime: '~20 seconds',
  },
  // Bigger picture
  {
    type: 'discrepancy_scan', tier: 'bigger', icon: ScanSearch,
    title: 'Batch Discrepancy Detection',
    description: 'Watch AI scan a batch of orders vs. as-run logs vs. invoices and surface every mismatch — unbilled revenue, wrong rates, spot count errors — in one pass.',
    manualTime: '2-4 hours per weekly audit', aiTime: '~45 seconds',
  },
];

const TIER_LABELS: Record<DemoTier, { title: string; subtitle: string }> = {
  immediate: { title: 'Immediate Wins', subtitle: 'Deploy now — high impact, low effort' },
  medium: { title: 'Medium-Term Automation', subtitle: 'Higher complexity, transformative value' },
  bigger: { title: 'Bigger Picture', subtitle: 'Batch monitoring & audit at scale' },
};

// --- Demo data objects (consistent with syntheticData) ---

const DISPUTE_DATA = {
  id: 'DSP-301', agency: 'Dentsu International', advertiser: 'Lexus', type: 'Wrong rate',
  amount: 4200, orderId: 'WO-2026-4521D', invoiceId: 'INV-7834',
  orderedCPM: 850, billedCPM: 920, spots: 60,
  contractAmendment: 'CA-2026-0089', flightDates: 'March 1-8, 2026',
  daypart: 'M-F 6-10a',
};

const COLLECTIONS_DATA = {
  agency: 'Horizon Media', contactEmail: 'ap@horizonmedia.com',
  invoices: [
    { id: 'INV-7756', amount: 12400, campaign: 'Toyota - Winter Clearance', spots: 15, dates: 'Feb 10-14', daypart: 'M-F Early Morning' },
    { id: 'INV-7761', amount: 14600, campaign: 'Progressive - Bundle Save', spots: 20, dates: 'Feb 12-19', daypart: 'M-F Primetime' },
    { id: 'INV-7768', amount: 7500, campaign: 'Home Depot - Tool Sale', spots: 8, dates: 'Feb 17-21', daypart: 'Weekend Daytime' },
  ],
  totalOutstanding: 34500, daysOutstanding: 38, terms: 'Net 30',
  affidavitsDelivered: 'February 25, 2026',
};

const CASH_MATCH_DATA = {
  payment: PAYMENTS.find(p => p.ref === 'CHK-89234')!,
  openAR: INVOICES.filter(i => i.agency === 'GroupM Media' && i.status !== 'current').slice(0, 6).map(i => ({
    id: i.id, amount: i.amount, advertiser: i.advertiser, campaign: i.campaign, dueDate: i.dueDate, status: i.status,
  })),
};

const AP_VERIFY_DATA = {
  orderId: 'WO-2026-4521D',
  advertiser: 'Lexus',
  agency: 'Dentsu International',
  contractedCPM: 850,
  billedCPM: 920,
  orderedSpots: 60,
  airedSpots: 60,
  billedSpots: 60,
  contractTerms: 'Net 45 per annual agreement',
  invoiceTerms: 'Net 45',
  agencyCommission: 15,
  totalBilled: 55200,
  expectedTotal: 51000,
  contractRef: 'CA-2026-0089',
  invoiceId: 'INV-7834',
};

const DISCREPANCY_DATA = RECONCILIATION;

// --- Demo step animations & fallback outputs ---

const DEMO_STEPS: Record<DemoType, string[]> = {
  dispute: [
    'Pulling original order WO-2026-4521D from Snowflake...',
    'Retrieving as-run log for March 1-8 flight dates...',
    'Loading contract terms for Dentsu International...',
    'Comparing ordered rate ($850 CPM) vs. billed rate ($920 CPM)...',
    'Pulling makegood history for this advertiser...',
    'Generating dispute resolution summary...',
  ],
  collections: [
    'Loading aging data for Horizon Media...',
    'Pulling specific overdue invoices (3 found)...',
    'Retrieving spot details and flight dates...',
    'Checking payment history and contact preferences...',
    'Generating personalized first notice...',
  ],
  cash_match: [
    'Analyzing incoming payment CHK-89234 for $87,450...',
    'Loading open AR for GroupM Media (47 open invoices)...',
    'Running probabilistic matching algorithm...',
    'Testing combination matches against remittance data...',
    'Identifying best match with confidence scoring...',
  ],
  ap_verify: [
    'Loading order WO-2026-4521D from WideOrbit mirror...',
    'Pulling contract amendment CA-2026-0089...',
    'Cross-referencing billed rates vs. contracted rates...',
    'Verifying spot count against as-run log...',
    'Checking payment terms and commission calculation...',
    'Generating verification report...',
  ],
  discrepancy_scan: [
    'Loading 12 recent order-to-invoice records...',
    'Cross-referencing ordered vs. aired vs. billed for each...',
    'Scanning for rate variances...',
    'Checking for unbilled aired inventory...',
    'Identifying spot count mismatches...',
    'Calculating total revenue impact...',
    'Generating audit summary with priority actions...',
  ],
};

const DEMO_FALLBACKS: Record<DemoType, string> = {
  dispute: `**Dispute DSP-301 Resolution Summary**

**Agency:** Dentsu International
**Dispute Type:** Wrong rate applied
**Amount in question:** $4,200

**Findings:**
The original order (WO-2026-4521D) specifies a negotiated CPM of $850 for M-F 6-10a daypart per contract amendment dated 2026-01-15. The invoice (INV-7834) was generated at the standard rate card CPM of $920.

**Root Cause:** The contract amendment was entered in WideOrbit but the billing record pulled the rate card rate instead of the contracted rate. This is a confirmed billing error.

**Recommended Resolution:**
- Issue credit memo for $4,200 (difference of $70 CPM x 60 spots)
- Update WideOrbit rate override for remaining flight dates
- Flag similar orders for this agency for rate audit

**Supporting Documents:** Order WO-2026-4521D, Contract Amendment CA-2026-0089, As-Run Log 03/01-03/08, Invoice INV-7834`,

  collections: `**Subject:** Friendly Reminder — 3 Outstanding Invoices Totaling $34,500

Dear Accounts Payable Team at Horizon Media,

I hope this message finds you well. I'm reaching out regarding three invoices that are now past their Net 30 terms:

- **INV-7756** — $12,400 — Toyota Winter Clearance, 15 spots aired Feb 10-14 (M-F Early Morning)
- **INV-7761** — $14,600 — Progressive Bundle Save, 20 spots aired Feb 12-19 (M-F Primetime)
- **INV-7768** — $7,500 — Home Depot Tool Sale, 8 spots aired Feb 17-21 (Weekend Daytime)

These invoices total **$34,500** and are currently **38 days outstanding**. Affidavits of performance for all spots were delivered on February 25th.

Could you confirm these are in your payment queue? If there are any discrepancies or questions about specific spots, I'm happy to pull the as-run documentation.

Best regards,
Collections Team`,

  cash_match: `**Cash Application Analysis — Payment CHK-89234**

**From:** GroupM Media
**Amount:** $87,450.00
**Received:** ${CASH_MATCH_DATA.payment.receivedDate}

**Match Results (92% confidence):**

| Invoice | Amount | Advertiser | Match |
|---------|--------|------------|-------|
| INV-7823 | $45,200 | General Motors | Full match |
| INV-7824 | $38,100 | Nike | Full match |
| INV-7819 | $4,150 | Johnson & Johnson | Exact remainder |
| **Total** | **$87,450** | | **100% applied** |

**Analysis:** Payment appears to cover INV-7823 and INV-7824 in full, with the remaining $4,150 matching INV-7819 exactly. The remittance reference "Feb Broadcast" aligns with all three invoices being from the February broadcast cycle.

**Recommendation:** Auto-apply to INV-7823 ($45,200) + INV-7824 ($38,100) + INV-7819 ($4,150). No short-pay detected.`,

  ap_verify: `**AP Invoice Verification — INV-7834**

**Order:** WO-2026-4521D | **Agency:** Dentsu International | **Advertiser:** Lexus

| Check | Expected | Billed | Status |
|-------|----------|--------|--------|
| CPM Rate | $850 (per CA-2026-0089) | $920 (rate card) | FAIL — $70 overage |
| Spot Count | 60 | 60 | PASS |
| Payment Terms | Net 45 | Net 45 | PASS |
| Agency Commission | 15% | 15% | PASS |
| Total Amount | $51,000 | $55,200 | FAIL — $4,200 overage |

**Discrepancy Found:** Invoice uses standard rate card CPM ($920) instead of contracted CPM ($850) per amendment CA-2026-0089.

**Dollar Impact:** $4,200 overbilled ($70 x 60 spots)

**Recommended Action:**
1. Credit memo for $4,200 to Dentsu International
2. Update WideOrbit rate override for order WO-2026-4521D
3. Audit other Dentsu orders for same rate card override issue`,

  discrepancy_scan: `**Batch Reconciliation Audit — ${RECONCILIATION.length} Records Scanned**

**Summary:**
- Clean matches: ${RECONCILIATION.filter(r => r.status === 'clean').length} orders
- Issues found: ${RECONCILIATION.filter(r => r.status !== 'clean').length} orders

**Issues by Type:**

| Type | Count | Revenue Impact |
|------|-------|---------------|
| Unbilled (aired, not invoiced) | ${RECONCILIATION.filter(r => r.status === 'unbilled').length} | $${RECONCILIATION.filter(r => r.status === 'unbilled').reduce((s, r) => s + Math.abs(r.variance), 0).toLocaleString()} at risk |
| Under-billed | ${RECONCILIATION.filter(r => r.status === 'under_billed').length} | $${RECONCILIATION.filter(r => r.status === 'under_billed').reduce((s, r) => s + Math.abs(r.variance), 0).toLocaleString()} |
| Over-billed | ${RECONCILIATION.filter(r => r.status === 'over_billed').length} | $${RECONCILIATION.filter(r => r.status === 'over_billed').reduce((s, r) => s + Math.abs(r.variance), 0).toLocaleString()} |
| Spot mismatch | ${RECONCILIATION.filter(r => r.status === 'spot_mismatch').length} | Billing accuracy issue |

**Total Revenue at Risk: $${RECONCILIATION.filter(r => r.variance < 0).reduce((s, r) => s + Math.abs(r.variance), 0).toLocaleString()}**

**Priority Actions:**
1. **Walmart (WO-2026-4401)** — $31,500 unbilled, 15 days since air. Invoice immediately.
2. **Home Depot (WO-2026-4467)** — $23,100 unbilled, 11 days since air.
3. **Ford Motor (WO-2026-4375)** — $22,400 unbilled, 10 days since air.
4. **Toyota/Saatchi (WO-2026-4521)** — $18,400 unbilled, 7 days since air.
5. **Lexus/Dentsu (WO-2026-4521D)** — $4,200 overbilled — issue credit memo.

**Pattern:** Multiple unbilled orders are from different agencies, suggesting a systemic delay in the traffic-to-billing handoff rather than an agency-specific issue.`,
};

interface AIDemoProps {
  onNavigate: (view: View) => void;
}

export function AIDemo({ onNavigate }: AIDemoProps) {
  const [activeDemo, setActiveDemo] = useState<DemoType | null>(null);
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [liveResult, setLiveResult] = useState<string | null>(null);
  const [usedLiveAI, setUsedLiveAI] = useState(false);

  const runDemo = async (type: DemoType) => {
    setActiveDemo(type);
    setRunning(true);
    setCurrentStep(0);
    setShowResult(false);
    setLiveResult(null);
    setUsedLiveAI(false);

    const steps = DEMO_STEPS[type];

    // Animate steps
    let i = 0;
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        i++;
        setCurrentStep(i);
        if (i >= steps.length) { clearInterval(interval); resolve(); }
      }, 800);
    });

    // Try live Claude API, fall back to mock
    try {
      let result: string;
      if (type === 'dispute') {
        result = await resolveDispute(DISPUTE_DATA);
      } else if (type === 'collections') {
        result = await draftCollectionsEmail(COLLECTIONS_DATA, 'first');
      } else if (type === 'cash_match') {
        result = await analyzeCashMatch(CASH_MATCH_DATA.payment, CASH_MATCH_DATA.openAR);
      } else if (type === 'ap_verify') {
        result = await verifyAPInvoice(AP_VERIFY_DATA);
      } else {
        result = await scanDiscrepancies(DISCREPANCY_DATA);
      }
      setLiveResult(result);
      setUsedLiveAI(true);
    } catch {
      setLiveResult(null);
      setUsedLiveAI(false);
    }

    setRunning(false);
    setShowResult(true);
  };

  const tiers: DemoTier[] = ['immediate', 'medium', 'bigger'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-1 text-sm text-surface-500 hover:text-brand-600 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-surface-900">AI Automation Demos</h1>
        <p className="text-surface-500 mt-1">
          Live simulations showing how Claude processes real O2C tasks using WideOrbit Snowflake data
        </p>
      </div>

      {/* Demo cards by tier */}
      {tiers.map(tier => {
        const tierDemos = DEMOS.filter(d => d.tier === tier);
        const { title, subtitle } = TIER_LABELS[tier];
        return (
          <div key={tier}>
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-surface-900">{title}</h2>
              <p className="text-xs text-surface-500">{subtitle}</p>
            </div>
            <div className={`grid grid-cols-1 ${tierDemos.length >= 2 ? 'md:grid-cols-2' : ''} gap-4`}>
              {tierDemos.map(demo => (
                <div key={demo.type} className="card-hover p-5 flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                      <demo.icon className="w-5 h-5 text-brand-600" />
                    </div>
                    <h3 className="font-semibold text-surface-900">{demo.title}</h3>
                  </div>
                  <p className="text-sm text-surface-500 mb-4 flex-1">{demo.description}</p>
                  <div className="flex items-center gap-4 text-xs mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span className="text-surface-500">Manual: {demo.manualTime}</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-surface-300" />
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-600 font-medium">AI: {demo.aiTime}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => runDemo(demo.type)}
                    disabled={running}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {running && activeDemo === demo.type ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Run Demo</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Demo output */}
      {activeDemo && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-surface-200 bg-surface-50">
            <h3 className="font-semibold text-surface-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              {DEMOS.find(d => d.type === activeDemo)?.title} — AI Processing
            </h3>
          </div>

          {/* Processing steps */}
          <div className="p-4 border-b border-surface-200">
            <div className="space-y-2">
              {DEMO_STEPS[activeDemo].map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {i < currentStep ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : i === currentStep && running ? (
                    <Loader2 className="w-4 h-4 text-brand-500 animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-surface-200 flex-shrink-0" />
                  )}
                  <span className={i <= currentStep ? 'text-surface-700' : 'text-surface-400'}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Result */}
          {showResult && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {usedLiveAI ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <Wifi className="w-3 h-3" /> Live Claude Response
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
                    <WifiOff className="w-3 h-3" /> Simulated Output (add ANTHROPIC_API_KEY for live)
                  </span>
                )}
              </div>
              <div className="bg-surface-50 rounded-lg p-4 font-mono text-sm text-surface-700 whitespace-pre-wrap leading-relaxed">
                {liveResult || DEMO_FALLBACKS[activeDemo]}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
