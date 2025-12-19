import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, AlertTriangle, DollarSign, Calculator } from 'lucide-react';

interface SocialRevenueEducationProps {
  compact?: boolean;
}

export function SocialRevenueEducation({ compact = false }: SocialRevenueEducationProps) {
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    return (
      <div className="relative group">
        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
          <HelpCircle className="w-4 h-4" />
        </button>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl">
          <p className="mb-2">
            <strong>Why are social CPMs so low?</strong>
          </p>
          <p className="text-gray-300">
            Kids content is restricted under COPPA (Children's Online Privacy Protection Act).
            This limits targeted advertising, resulting in CPMs of $0.25-$0.50 vs $3-$5 for general content.
          </p>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
            <div className="border-8 border-transparent border-t-gray-900" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">Understanding Social Media Revenue</h3>
            <p className="text-xs text-gray-500">How platforms pay creators for kids content</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h4 className="font-semibold text-gray-900">What is CPM?</h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                CPM = "Cost Per Mille" (per 1,000 impressions). It's how much advertisers pay to show their ads 1,000 times.
              </p>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Formula:</div>
                <div className="font-mono text-sm text-gray-900">
                  Revenue = (CPM x Views) / 1,000
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h4 className="font-semibold text-gray-900">COPPA Impact</h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Kids content is regulated under COPPA (Children's Online Privacy Protection Act),
                which restricts behavioral advertising and data collection.
              </p>
              <div className="text-sm">
                <div className="flex justify-between py-1 border-b border-amber-200">
                  <span className="text-gray-600">General content CPM:</span>
                  <span className="font-semibold text-gray-900">$3 - $5</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Kids content CPM:</span>
                  <span className="font-semibold text-amber-700">$0.25 - $0.50</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-gray-900">Real Example: YouTube Kids Content</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Gross Revenue</div>
                <div className="text-lg font-bold text-gray-900">$350</div>
                <div className="text-xs text-gray-500 mt-1">
                  1M views x $0.35 CPM / 1000
                </div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Platform Cut (45%)</div>
                <div className="text-lg font-bold text-red-600">-$157.50</div>
                <div className="text-xs text-gray-500 mt-1">
                  YouTube keeps 45% of ad revenue
                </div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Your Net Revenue</div>
                <div className="text-lg font-bold text-emerald-600">$192.50</div>
                <div className="text-xs text-gray-500 mt-1">
                  55% creator share
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Platform Revenue Comparison</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium text-gray-700">YouTube</div>
                <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: '55%' }} />
                </div>
                <div className="w-32 text-sm text-gray-600">55% creator share</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium text-gray-700">TikTok</div>
                <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-800 rounded-full" style={{ width: '50%' }} />
                </div>
                <div className="w-32 text-sm text-gray-600">~50% creator share</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium text-gray-700">O&O Platform</div>
                <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                </div>
                <div className="w-32 text-sm text-gray-600">100% (you own it)</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Social vs. Traditional TV Comparison</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500 mb-1">Social (1M YouTube views)</div>
                <div className="text-xl font-bold text-gray-900">$192.50 <span className="text-sm font-normal text-gray-500">net</span></div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">Linear TV (4 spots x $350)</div>
                <div className="text-xl font-bold text-gray-900">$1,400 <span className="text-sm font-normal text-gray-500">net</span></div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Traditional TV generates significantly more revenue per airing, but social platforms offer broader reach and discoverability.
              A multi-channel strategy typically works best.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
