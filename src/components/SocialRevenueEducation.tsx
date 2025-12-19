import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, DollarSign, TrendingUp, Users, Sparkles, BarChart3, Info } from 'lucide-react';

interface SocialRevenueEducationProps {
  compact?: boolean;
}

const MONTHLY_EARNINGS_DATA = [
  { views: '50K', adLow: 25, adHigh: 300, sponsorLow: 0, sponsorHigh: 1000 },
  { views: '100K', adLow: 50, adHigh: 800, sponsorLow: 1000, sponsorHigh: 3000 },
  { views: '500K', adLow: 250, adHigh: 4000, sponsorLow: 5000, sponsorHigh: 15000 },
  { views: '1M+', adLow: 500, adHigh: 8000, sponsorLow: 10000, sponsorHigh: 30000 }
];

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
            <strong>YouTube Revenue Explained</strong>
          </p>
          <p className="text-gray-300 mb-2">
            RPM (Revenue Per Mille): What creators earn per 1,000 views after YouTube's 45% cut.
            Typical range: $0.50 - $8.00 depending on niche.
          </p>
          <p className="text-gray-300">
            Sponsorships often pay $10-$30 per 1,000 views - usually more than ad revenue!
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
        className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">YouTube Monetization Guide</h3>
            <p className="text-xs text-gray-500">How creators actually earn money on YouTube</p>
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
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">Key Insight</h4>
                <p className="text-sm text-gray-700">
                  Most successful creators earn more from sponsorships than ads. At 100K monthly views,
                  ad revenue might be $50-$800, but a single sponsorship can pay $1,000-$3,000.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h4 className="font-semibold text-gray-900">CPM vs RPM</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-gray-700">CPM (Cost Per Mille)</div>
                  <p className="text-gray-600 text-xs mb-1">What advertisers pay per 1,000 ad views</p>
                  <div className="bg-white rounded px-3 py-1.5 border border-gray-200">
                    <span className="font-semibold text-gray-900">$2 - $20+</span>
                    <span className="text-gray-500 text-xs ml-2">(varies by niche)</span>
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">RPM (Revenue Per Mille)</div>
                  <p className="text-gray-600 text-xs mb-1">What creators actually earn per 1,000 total views</p>
                  <div className="bg-white rounded px-3 py-1.5 border border-gray-200">
                    <span className="font-semibold text-emerald-600">$0.50 - $8</span>
                    <span className="text-gray-500 text-xs ml-2">(after YouTube's cut)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <h4 className="font-semibold text-gray-900">Sponsorships</h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Brand deals are often the biggest income source for mid-to-large creators.
              </p>
              <div className="bg-white/80 rounded-lg p-3 border border-amber-200">
                <div className="text-xs text-gray-500 mb-1">Typical Rate per 1,000 Views</div>
                <div className="text-2xl font-bold text-amber-700">$10 - $30</div>
                <div className="text-xs text-gray-500 mt-1">
                  Often 5-10x more than ad revenue per view!
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-gray-900">Monthly Earnings by View Count</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-medium text-gray-700">Monthly Views</th>
                    <th className="text-right py-2 font-medium text-gray-700">Ad Revenue</th>
                    <th className="text-right py-2 font-medium text-gray-700">Sponsorship</th>
                    <th className="text-right py-2 font-medium text-emerald-700">Total Potential</th>
                  </tr>
                </thead>
                <tbody>
                  {MONTHLY_EARNINGS_DATA.map((row, index) => (
                    <tr key={index} className="border-b border-gray-100 last:border-0">
                      <td className="py-2.5 font-medium text-gray-900">{row.views}</td>
                      <td className="py-2.5 text-right text-gray-600">
                        ${row.adLow.toLocaleString()} - ${row.adHigh.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right text-amber-700">
                        ${row.sponsorLow.toLocaleString()} - ${row.sponsorHigh.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-emerald-600">
                        ${(row.adLow + row.sponsorLow).toLocaleString()} - ${(row.adHigh + row.sponsorHigh).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Ranges vary based on content niche, audience demographics, and engagement rates.
              Finance, tech, and business content typically earn higher rates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900 text-sm">YPP Requirements</h4>
              </div>
              <p className="text-xs text-gray-500 mb-3">To join YouTube Partner Program:</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Subscribers</span>
                  <span className="font-semibold text-gray-900">1,000</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Watch hours (12 mo)</span>
                  <span className="font-semibold text-gray-900">4,000</span>
                </div>
                <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                  Or 10M Shorts views in 90 days
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 text-sm mb-3">Revenue Split</h4>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">YouTube</span>
                    <span className="font-medium text-gray-900">45%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: '45%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Creator (You)</span>
                    <span className="font-medium text-emerald-600">55%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '55%' }} />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Sponsorship revenue is typically 100% yours (minus any agency fees).
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Real Example: 100,000 Monthly Views</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Ad Revenue (RPM $4)</div>
                <div className="text-lg font-bold text-gray-900">$400</div>
                <div className="text-xs text-gray-500 mt-1">
                  After YouTube's 45% cut
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-amber-200">
                <div className="text-xs text-gray-500 mb-1">Sponsorship ($20/1K)</div>
                <div className="text-lg font-bold text-amber-700">$2,000</div>
                <div className="text-xs text-gray-500 mt-1">
                  1 brand deal at typical rates
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-emerald-200">
                <div className="text-xs text-gray-500 mb-1">Total Monthly</div>
                <div className="text-lg font-bold text-emerald-600">$2,400</div>
                <div className="text-xs text-gray-500 mt-1">
                  5x what ads alone would pay
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">Kids Content (COPPA)</h4>
                <p className="text-sm text-gray-700">
                  Content made for children has restricted ad targeting under COPPA, reducing ad RPM to
                  approximately $0.50-$2.00. However, sponsorships from toy brands and family-friendly
                  companies can still generate significant revenue.
                </p>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Data based on 2024 YouTube Partner Program rates and industry averages.
            Individual results vary based on niche, audience, and engagement.
          </div>
        </div>
      )}
    </div>
  );
}
