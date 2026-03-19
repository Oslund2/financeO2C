import { useState } from 'react';
import { Database, Search, Sparkles, RefreshCw, ArrowLeft, Loader2, Wifi, WifiOff, AlertTriangle, TrendingDown, FileWarning, CreditCard, Scale, ListOrdered, GitCompare, Banknote } from 'lucide-react';
import { View } from './Layout';
import { queryDataNL } from '../lib/claude';
import {
  getAgingQueryResult,
  getTopAgenciesQueryResult,
  getUnbilledOrdersQueryResult,
  getUnmatchedPaymentsQueryResult,
  getDisputesQueryResult,
  getCollectionsQueueQueryResult,
  getReconciliationQueryResult,
  getCashMatchQueryResult,
  getDataContextForClaude,
  KPI_METRICS,
  QueryResult,
} from '../data/syntheticData';

interface PresetQuery {
  id: string;
  name: string;
  description: string;
  icon: typeof Database;
  getData: () => QueryResult;
  highlight?: 'warning' | 'danger';
}

const PRESET_QUERIES: PresetQuery[] = [
  { id: 'aging_summary', name: 'AR Aging Summary', description: 'Open receivables by aging bucket', icon: TrendingDown, getData: getAgingQueryResult },
  { id: 'top_agencies', name: 'Top Agencies by Open AR', description: `${KPI_METRICS.totalInvoiceCount.toLocaleString()} invoices across 18 agencies`, icon: Database, getData: getTopAgenciesQueryResult },
  { id: 'unbilled_orders', name: 'Unbilled Orders', description: `$${(KPI_METRICS.unbilledOrdersValue / 1000).toFixed(0)}K revenue at risk`, icon: FileWarning, getData: getUnbilledOrdersQueryResult, highlight: 'danger' },
  { id: 'unmatched_payments', name: 'Unmatched Payments', description: `${KPI_METRICS.unmatchedPayments} payments need matching`, icon: CreditCard, getData: getUnmatchedPaymentsQueryResult, highlight: 'warning' },
  { id: 'disputes', name: 'Active Disputes', description: `${KPI_METRICS.activeDisputes} open, $${(KPI_METRICS.disputeTotal / 1000).toFixed(0)}K total`, icon: Scale, getData: getDisputesQueryResult },
  { id: 'collections_queue', name: 'Collections Priority Queue', description: 'AI-ranked overdue accounts', icon: ListOrdered, getData: getCollectionsQueueQueryResult },
  { id: 'reconciliation', name: 'Order-to-Invoice Reconciliation', description: 'Ordered vs. aired vs. billed', icon: GitCompare, getData: getReconciliationQueryResult, highlight: 'warning' },
  { id: 'cash_match', name: 'Cash Application Status', description: 'Payment matching with confidence', icon: Banknote, getData: getCashMatchQueryResult },
];

// Pre-canned NL fallbacks in case Claude API is unavailable
const NL_FALLBACKS: Record<string, string> = {
  default: `**Unable to reach Claude API** — showing pre-built view instead.\n\nTo enable live natural language queries, ensure your ANTHROPIC_API_KEY is configured in Netlify environment variables. Claude will answer questions using your WideOrbit Snowflake mirror data.`,
};

interface DataExplorerProps {
  onNavigate: (view: View) => void;
}

export function DataExplorer({ onNavigate }: DataExplorerProps) {
  const [activeQueryId, setActiveQueryId] = useState(PRESET_QUERIES[0].id);
  const [nlQuery, setNlQuery] = useState('');
  const [nlResult, setNlResult] = useState<string | null>(null);
  const [nlLoading, setNlLoading] = useState(false);
  const [nlUsedLive, setNlUsedLive] = useState(false);

  const activePreset = PRESET_QUERIES.find(q => q.id === activeQueryId)!;
  const queryResult = activePreset.getData();

  const handleNlQuery = async () => {
    const q = nlQuery.trim();
    if (!q) return;

    setNlLoading(true);
    setNlResult(null);
    setNlUsedLive(false);

    try {
      const dataContext = getDataContextForClaude();
      const result = await queryDataNL(q, dataContext);
      setNlResult(result);
      setNlUsedLive(true);
    } catch {
      setNlResult(NL_FALLBACKS.default);
      setNlUsedLive(false);
    }

    setNlLoading(false);
  };

  const suggestedQuestions = [
    'Show me all invoices over 90 days past due by advertiser',
    'Which accounts have the largest open balances?',
    'Find spots that aired but haven\'t been billed yet',
    'What\'s our DSO trend by agency?',
    'Compare booked orders to invoiced amounts and flag mismatches',
    'Which make-goods are still unresolved?',
  ];

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
        <h1 className="text-2xl font-bold text-surface-900">Data Explorer</h1>
        <p className="text-surface-500 mt-1">
          Query WideOrbit data via Snowflake mirror — read-only access, real-time metrics
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPIBadge label="Total Open AR" value={`$${(KPI_METRICS.totalOpenAR / 1000000).toFixed(2)}M`} />
        <KPIBadge label="Avg DSO" value={`${KPI_METRICS.avgDSO} days`} />
        <KPIBadge label="Active Disputes" value={`${KPI_METRICS.activeDisputes}`} warn />
        <KPIBadge label="Unmatched Payments" value={`$${(KPI_METRICS.unmatchedPaymentsValue / 1000).toFixed(0)}K`} warn />
        <KPIBadge label="Unbilled Revenue" value={`$${(KPI_METRICS.unbilledOrdersValue / 1000).toFixed(0)}K`} danger />
      </div>

      {/* Natural Language Query */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-brand-600" />
          <h3 className="font-semibold text-surface-900 text-sm">Ask in Plain English</h3>
          <span className="text-xs text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">Powered by Claude</span>
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder='e.g., "Show me all invoices over 90 days for GroupM Media"'
            value={nlQuery}
            onChange={e => setNlQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !nlLoading && handleNlQuery()}
          />
          <button onClick={handleNlQuery} disabled={nlLoading || !nlQuery.trim()} className="btn-primary flex items-center gap-2">
            {nlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {nlLoading ? 'Querying...' : 'Query'}
          </button>
        </div>

        {/* Suggested questions */}
        <div className="flex flex-wrap gap-2 mt-3">
          {suggestedQuestions.map(q => (
            <button
              key={q}
              onClick={() => { setNlQuery(q); }}
              className="text-xs px-2.5 py-1 rounded-full border border-surface-200 text-surface-500 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all"
            >
              {q}
            </button>
          ))}
        </div>

        {/* NL Result */}
        {nlResult && (
          <div className="mt-4 p-4 bg-surface-50 rounded-lg border border-surface-200">
            <div className="flex items-center gap-2 mb-2">
              {nlUsedLive ? (
                <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <Wifi className="w-3 h-3" /> Live Claude Response
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
                  <WifiOff className="w-3 h-3" /> Fallback
                </span>
              )}
            </div>
            <div className="prose prose-sm max-w-none text-surface-700 whitespace-pre-wrap leading-relaxed">
              {nlResult}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Query sidebar */}
        <div className="space-y-2">
          <h3 className="font-semibold text-surface-900 text-sm mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-brand-600" />
            Pre-built Views
          </h3>
          {PRESET_QUERIES.map(q => (
            <button
              key={q.id}
              onClick={() => setActiveQueryId(q.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                activeQueryId === q.id
                  ? 'border-brand-300 bg-brand-50'
                  : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <q.icon className={`w-4 h-4 ${
                  q.highlight === 'danger' ? 'text-red-500' :
                  q.highlight === 'warning' ? 'text-amber-500' :
                  'text-brand-600'
                }`} />
                <div className="font-medium text-sm text-surface-900">{q.name}</div>
              </div>
              <div className="text-xs text-surface-500 mt-0.5 ml-6">{q.description}</div>
            </button>
          ))}
          <div className="pt-3 mt-3 border-t border-surface-200">
            <div className="flex items-center gap-2 text-xs text-surface-400">
              <RefreshCw className="w-3 h-3" />
              <span>Data from WideOrbit mirror</span>
            </div>
            <p className="text-xs text-surface-400 mt-1">
              Synthetic demo data — connect Snowflake for live queries
            </p>
          </div>
        </div>

        {/* Results table */}
        <div className="lg:col-span-3 card overflow-hidden">
          <div className="p-4 border-b border-surface-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-surface-900 flex items-center gap-2">
                <activePreset.icon className="w-4 h-4 text-brand-600" />
                {activePreset.name}
              </h3>
              <p className="text-xs text-surface-500">{activePreset.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {activePreset.highlight && (
                <AlertTriangle className={`w-4 h-4 ${activePreset.highlight === 'danger' ? 'text-red-500' : 'text-amber-500'}`} />
              )}
              <span className="text-xs text-surface-400 bg-surface-100 px-2 py-1 rounded">
                {queryResult.rows.length} rows
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50">
                <tr>
                  {queryResult.columns.map(col => (
                    <th key={col} className="text-left px-4 py-3 font-medium text-surface-500 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {queryResult.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-surface-50">
                    {row.map((cell, j) => {
                      const cellStr = typeof cell === 'number' ? cell.toLocaleString() : String(cell);
                      const isNegativeVariance = cellStr.startsWith('-$');
                      const isPositiveVariance = cellStr.startsWith('+$');
                      const isAtRisk = cellStr.includes('at risk') || cellStr.includes('TOTAL AT RISK');
                      const isUnbilled = cellStr === 'Unbilled' || cellStr.includes('Unbilled');
                      const isLowConfidence = cellStr.includes('%') && j === queryResult.columns.indexOf('Confidence') && parseInt(cellStr) < 50;

                      return (
                        <td key={j} className={`px-4 py-3 whitespace-nowrap ${
                          isNegativeVariance || isAtRisk || isUnbilled ? 'text-red-600 font-medium' :
                          isPositiveVariance ? 'text-amber-600 font-medium' :
                          isLowConfidence ? 'text-red-500 font-medium' :
                          'text-surface-700'
                        }`}>
                          {cellStr}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPIBadge({ label, value, warn, danger }: { label: string; value: string; warn?: boolean; danger?: boolean }) {
  return (
    <div className={`rounded-lg p-3 border ${
      danger ? 'bg-red-50 border-red-200' :
      warn ? 'bg-amber-50 border-amber-200' :
      'bg-surface-50 border-surface-200'
    }`}>
      <div className="text-xs text-surface-500">{label}</div>
      <div className={`text-lg font-bold ${
        danger ? 'text-red-700' : warn ? 'text-amber-700' : 'text-surface-900'
      }`}>{value}</div>
    </div>
  );
}
