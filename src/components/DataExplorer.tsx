import { useState } from 'react';
import { Database, Search, Table, BarChart3, Sparkles, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { View } from './Layout';

interface QueryResult {
  columns: string[];
  rows: (string | number)[][];
}

const PRESET_QUERIES: { id: string; name: string; description: string; mockData: QueryResult }[] = [
  {
    id: 'aging_summary',
    name: 'AR Aging Summary',
    description: 'Open receivables by aging bucket',
    mockData: {
      columns: ['Bucket', 'Invoice Count', 'Total Amount', '% of Total'],
      rows: [
        ['Current', 1245, '$2,847,000', '42.1%'],
        ['1-30 Days', 632, '$1,523,000', '22.5%'],
        ['31-60 Days', 298, '$891,000', '13.2%'],
        ['61-90 Days', 187, '$634,000', '9.4%'],
        ['90+ Days', 156, '$867,000', '12.8%'],
      ],
    },
  },
  {
    id: 'top_agencies',
    name: 'Top 20 Agencies by Open AR',
    description: 'Agencies with the largest outstanding balances',
    mockData: {
      columns: ['Agency', 'Open Invoices', 'Total Outstanding', 'Avg Days Out', 'Last Payment'],
      rows: [
        ['GroupM Media', 47, '$423,000', '34', '2026-03-01'],
        ['Publicis Groupe', 38, '$387,000', '28', '2026-03-05'],
        ['Dentsu International', 31, '$312,000', '41', '2026-02-22'],
        ['IPG Mediabrands', 29, '$298,000', '22', '2026-03-10'],
        ['Horizon Media', 24, '$267,000', '38', '2026-02-28'],
        ['Omnicom Media Group', 22, '$234,000', '31', '2026-03-03'],
        ['Havas Media', 19, '$198,000', '45', '2026-02-15'],
        ['Starcom', 17, '$176,000', '27', '2026-03-07'],
      ],
    },
  },
  {
    id: 'orders_missing_billing',
    name: 'Orders Missing Billing',
    description: 'Aired spots not yet moved to billing',
    mockData: {
      columns: ['Order ID', 'Advertiser', 'Agency', 'Air Date', 'Spots', 'Revenue', 'Days Since Air'],
      rows: [
        ['WO-2026-4521', 'Toyota Motor', 'Saatchi', '2026-03-08', 12, '$18,400', '7'],
        ['WO-2026-4498', 'Progressive Ins', 'Arnold', '2026-03-06', 8, '$12,200', '9'],
        ['WO-2026-4467', 'Home Depot', 'Richards', '2026-03-04', 15, '$23,100', '11'],
        ['WO-2026-4432', 'AT&T', 'BBDO', '2026-03-02', 6, '$9,800', '13'],
        ['WO-2026-4401', 'Walmart', 'Publicis', '2026-02-28', 20, '$31,500', '15'],
      ],
    },
  },
  {
    id: 'unmatched_payments',
    name: 'Unmatched Payments',
    description: 'Received payments not yet applied to invoices',
    mockData: {
      columns: ['Payment Ref', 'Agency', 'Amount', 'Received', 'Possible Match', 'Confidence'],
      rows: [
        ['CHK-89234', 'GroupM Media', '$87,450', '2026-03-12', 'INV-7823, INV-7824', '92%'],
        ['ACH-11298', 'Publicis', '$143,200', '2026-03-11', 'INV-7801 thru 7806', '88%'],
        ['CHK-89201', 'Horizon Media', '$34,500', '2026-03-10', 'Unknown', '15%'],
        ['ACH-11287', 'IPG Mediabrands', '$67,800', '2026-03-09', 'INV-7789 (short $2,100)', '78%'],
      ],
    },
  },
  {
    id: 'dispute_summary',
    name: 'Active Disputes',
    description: 'Open disputes requiring resolution',
    mockData: {
      columns: ['Dispute ID', 'Agency', 'Type', 'Amount', 'Filed', 'Status', 'Days Open'],
      rows: [
        ['DSP-301', 'Dentsu', 'Wrong rate', '$4,200', '2026-03-01', 'Under review', '14'],
        ['DSP-298', 'Havas', 'Missed makegood', '$2,800', '2026-02-25', 'Evidence gathered', '18'],
        ['DSP-295', 'GroupM', 'Wrong daypart', '$6,100', '2026-02-20', 'Pending response', '23'],
        ['DSP-291', 'Omnicom', 'Preempted spots', '$8,400', '2026-02-15', 'Escalated', '28'],
      ],
    },
  },
];

interface DataExplorerProps {
  onNavigate: (view: View) => void;
}

export function DataExplorer({ onNavigate }: DataExplorerProps) {
  const [activeQuery, setActiveQuery] = useState(PRESET_QUERIES[0]);
  const [nlQuery, setNlQuery] = useState('');
  const [showNlResult, setShowNlResult] = useState(false);

  const handleNlQuery = () => {
    if (nlQuery.trim()) {
      setShowNlResult(true);
    }
  };

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
          Query Wide Orbit data via Snowflake mirror — read-only access, real-time metrics
        </p>
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
            onChange={e => { setNlQuery(e.target.value); setShowNlResult(false); }}
            onKeyDown={e => e.key === 'Enter' && handleNlQuery()}
          />
          <button onClick={handleNlQuery} className="btn-primary flex items-center gap-2">
            <Search className="w-4 h-4" /> Query
          </button>
        </div>
        {showNlResult && (
          <div className="mt-3 p-3 bg-surface-50 rounded-lg border border-surface-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-surface-600">
                <strong>Snowflake connection required.</strong> Connect your Snowflake credentials in Settings
                to enable live natural language queries. Claude will translate your question to safe, read-only SQL
                and execute it against your Wide Orbit mirror.
              </div>
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
              onClick={() => setActiveQuery(q)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                activeQuery.id === q.id
                  ? 'border-brand-300 bg-brand-50'
                  : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50'
              }`}
            >
              <div className="font-medium text-sm text-surface-900">{q.name}</div>
              <div className="text-xs text-surface-500 mt-0.5">{q.description}</div>
            </button>
          ))}
          <div className="pt-3 mt-3 border-t border-surface-200">
            <div className="flex items-center gap-2 text-xs text-surface-400">
              <RefreshCw className="w-3 h-3" />
              <span>Last sync: Demo data</span>
            </div>
            <p className="text-xs text-surface-400 mt-2">
              Connect Snowflake to see live data from your Wide Orbit mirror.
            </p>
          </div>
        </div>

        {/* Results table */}
        <div className="lg:col-span-3 card overflow-hidden">
          <div className="p-4 border-b border-surface-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-surface-900">{activeQuery.name}</h3>
              <p className="text-xs text-surface-500">{activeQuery.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-surface-400 bg-surface-100 px-2 py-1 rounded">
                {activeQuery.mockData.rows.length} rows
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50">
                <tr>
                  {activeQuery.mockData.columns.map(col => (
                    <th key={col} className="text-left px-4 py-3 font-medium text-surface-500 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {activeQuery.mockData.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-surface-50">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-3 text-surface-700 whitespace-nowrap">
                        {typeof cell === 'number' ? cell.toLocaleString() : cell}
                      </td>
                    ))}
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
