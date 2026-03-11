import { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Zap,
  Clock,
  RotateCcw,
  Package,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

interface SpotCost {
  aiGenerationCost: number;
  humanCreativeHours: number;
  humanHourlyRate: number;
  musicLicensing: number;
  legalReview: number;
  deliveryTrafficking: number;
  revisionRoundsExtra: number;
  revisionRoundCost: number;
  variantCount: number;
  variantCostEach: number;
}

interface ProjectFees {
  clientBillingTotal: number;
  platformFeePerSpot: number;
  spotCount: number;
}

const DEFAULT_COSTS: SpotCost = {
  aiGenerationCost: 45,
  humanCreativeHours: 4,
  humanHourlyRate: 150,
  musicLicensing: 250,
  legalReview: 200,
  deliveryTrafficking: 150,
  revisionRoundsExtra: 0,
  revisionRoundCost: 500,
  variantCount: 2,
  variantCostEach: 75,
};

const DEFAULT_FEES: ProjectFees = {
  clientBillingTotal: 12000,
  platformFeePerSpot: 300,
  spotCount: 1,
};

// Traditional agency benchmarks (for AI Advantage comparison)
const TRADITIONAL = {
  conceptDevelopment: 8000,
  productionCost30: 35000,
  productionCost15: 18000,
  productionCost10: 10000,
  revisionRoundCost: 3500,
  timeWeeks: 6,
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

interface CommercialEconomicsProps {
  spotLengthSeconds?: 10 | 15 | 30;
}

export function CommercialEconomics({ spotLengthSeconds = 30 }: CommercialEconomicsProps) {
  const [costs, setCosts] = useState<SpotCost>({ ...DEFAULT_COSTS });
  const [fees, setFees] = useState<ProjectFees>({ ...DEFAULT_FEES });
  const [showAiAdvantage, setShowAiAdvantage] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(true);

  // ── Calculations ──────────────────────────────────────────────────────────
  const humanLaborCost = costs.humanCreativeHours * costs.humanHourlyRate;
  const extraRevisionCost = costs.revisionRoundsExtra * costs.revisionRoundCost;
  const variantsCost = costs.variantCount * costs.variantCostEach;
  const platformCost = fees.platformFeePerSpot * fees.spotCount;

  const totalProductionCost =
    (costs.aiGenerationCost +
      humanLaborCost +
      costs.musicLicensing +
      costs.legalReview +
      costs.deliveryTrafficking +
      extraRevisionCost +
      variantsCost) * fees.spotCount + platformCost;

  const grossProfit = fees.clientBillingTotal - totalProductionCost;
  const grossMargin = fees.clientBillingTotal > 0 ? (grossProfit / fees.clientBillingTotal) * 100 : 0;

  // Traditional comparison
  const traditionalBase =
    spotLengthSeconds === 30 ? TRADITIONAL.productionCost30 :
    spotLengthSeconds === 15 ? TRADITIONAL.productionCost15 :
    TRADITIONAL.productionCost10;

  const traditionalTotal =
    (TRADITIONAL.conceptDevelopment + traditionalBase + TRADITIONAL.revisionRoundCost * costs.revisionRoundsExtra) * fees.spotCount;

  const traditionalMargin = fees.clientBillingTotal > 0
    ? ((fees.clientBillingTotal - traditionalTotal) / fees.clientBillingTotal) * 100
    : 0;

  const marginImprovement = grossMargin - traditionalMargin;
  const costReduction = traditionalTotal > 0 ? ((traditionalTotal - totalProductionCost) / traditionalTotal) * 100 : 0;

  const marginColor = grossMargin >= 80 ? 'text-green-600' : grossMargin >= 60 ? 'text-yellow-600' : 'text-red-600';
  const marginBg = grossMargin >= 80 ? 'bg-green-50 border-green-200' : grossMargin >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Project Economics</h2>
        <p className="text-sm text-gray-600 mt-0.5">Model your production costs and client billing to optimize margins.</p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`rounded-xl border p-4 ${marginBg}`}>
          <div className="text-xs font-medium text-gray-500 mb-1">Gross Margin</div>
          <div className={`text-2xl font-bold ${marginColor}`}>{formatPercent(grossMargin)}</div>
          <div className="text-xs text-gray-500 mt-0.5">Target: ≥80%</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Gross Profit</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(grossProfit)}</div>
          <div className="text-xs text-gray-500 mt-0.5">Per project</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Production Cost</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalProductionCost)}</div>
          <div className="text-xs text-gray-500 mt-0.5">AI + labor + extras</div>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Cost Reduction vs. Traditional</div>
          <div className="text-2xl font-bold text-blue-700">{formatPercent(costReduction)}</div>
          <div className="text-xs text-gray-500 mt-0.5">vs. agency benchmark</div>
        </div>
      </div>

      {/* Project Fee Inputs */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-600" />
          Client Billing
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Project Fee ($)</label>
            <input
              type="number"
              value={fees.clientBillingTotal}
              onChange={e => setFees(p => ({ ...p, clientBillingTotal: Number(e.target.value) }))}
              min={0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-xs text-gray-500 mt-1">What the client is paying you for this project.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Hero Spots</label>
            <input
              type="number"
              value={fees.spotCount}
              onChange={e => setFees(p => ({ ...p, spotCount: Number(e.target.value) }))}
              min={1}
              max={50}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Platform Fee Per Spot ($)</label>
            <input
              type="number"
              value={fees.platformFeePerSpot}
              onChange={e => setFees(p => ({ ...p, platformFeePerSpot: Number(e.target.value) }))}
              min={0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-xs text-gray-500 mt-1">Scripps AI Studio usage fee per produced spot.</p>
          </div>
        </div>
      </div>

      {/* Production Cost Breakdown */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowBreakdown(p => !p)}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
        >
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-600" />
            Production Cost Breakdown (per spot)
          </h3>
          {showBreakdown ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showBreakdown && (
          <div className="border-t border-gray-200 p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* AI generation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI Generation Cost ($)
                  <span className="text-xs text-gray-400 ml-1 font-normal">(scripts, images, video clips)</span>
                </label>
                <input
                  type="number"
                  value={costs.aiGenerationCost}
                  onChange={e => setCosts(p => ({ ...p, aiGenerationCost: Number(e.target.value) }))}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Human labor */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Creative Hours</label>
                  <input
                    type="number"
                    value={costs.humanCreativeHours}
                    onChange={e => setCosts(p => ({ ...p, humanCreativeHours: Number(e.target.value) }))}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                  <input
                    type="number"
                    value={costs.humanHourlyRate}
                    onChange={e => setCosts(p => ({ ...p, humanHourlyRate: Number(e.target.value) }))}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Music Licensing ($)</label>
                <input
                  type="number"
                  value={costs.musicLicensing}
                  onChange={e => setCosts(p => ({ ...p, musicLicensing: Number(e.target.value) }))}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Legal Review ($)</label>
                <input
                  type="number"
                  value={costs.legalReview}
                  onChange={e => setCosts(p => ({ ...p, legalReview: Number(e.target.value) }))}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery & Trafficking ($)</label>
                <input
                  type="number"
                  value={costs.deliveryTrafficking}
                  onChange={e => setCosts(p => ({ ...p, deliveryTrafficking: Number(e.target.value) }))}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Extra Revision Rounds</label>
                  <input
                    type="number"
                    value={costs.revisionRoundsExtra}
                    onChange={e => setCosts(p => ({ ...p, revisionRoundsExtra: Number(e.target.value) }))}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost / Round ($)</label>
                  <input
                    type="number"
                    value={costs.revisionRoundCost}
                    onChange={e => setCosts(p => ({ ...p, revisionRoundCost: Number(e.target.value) }))}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Variant Cutdowns</label>
                  <input
                    type="number"
                    value={costs.variantCount}
                    onChange={e => setCosts(p => ({ ...p, variantCount: Number(e.target.value) }))}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost / Variant ($)</label>
                  <input
                    type="number"
                    value={costs.variantCostEach}
                    onChange={e => setCosts(p => ({ ...p, variantCostEach: Number(e.target.value) }))}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Line-item summary */}
            <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
              {[
                { label: 'AI Generation', value: costs.aiGenerationCost },
                { label: `Human Creative (${costs.humanCreativeHours}h × ${formatCurrency(costs.humanHourlyRate)})`, value: humanLaborCost },
                { label: 'Music Licensing', value: costs.musicLicensing },
                { label: 'Legal Review', value: costs.legalReview },
                { label: 'Delivery & Trafficking', value: costs.deliveryTrafficking },
                ...(extraRevisionCost > 0 ? [{ label: `Extra Revision Rounds (${costs.revisionRoundsExtra}×)`, value: extraRevisionCost }] : []),
                ...(variantsCost > 0 ? [{ label: `Variant Cutdowns (${costs.variantCount}×)`, value: variantsCost }] : []),
              ].map(line => (
                <div key={line.label} className="flex justify-between text-gray-700">
                  <span>{line.label}</span>
                  <span className="font-medium">{formatCurrency(line.value)}</span>
                </div>
              ))}
              {fees.spotCount > 1 && (
                <div className="flex justify-between text-gray-500 italic text-xs">
                  <span>× {fees.spotCount} spots</span>
                  <span>{formatCurrency(
                    (costs.aiGenerationCost + humanLaborCost + costs.musicLicensing + costs.legalReview + costs.deliveryTrafficking + extraRevisionCost + variantsCost) * fees.spotCount
                  )}</span>
                </div>
              )}
              {platformCost > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Platform Fee ({fees.spotCount} spot{fees.spotCount > 1 ? 's' : ''} × {formatCurrency(fees.platformFeePerSpot)})</span>
                  <span className="font-medium">{formatCurrency(platformCost)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2">
                <span>Total Production Cost</span>
                <span>{formatCurrency(totalProductionCost)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* P&L Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-600" />
          Project P&L
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Client Billing (Revenue)</span>
            <span className="font-semibold text-gray-900">{formatCurrency(fees.clientBillingTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Total Production Cost</span>
            <span className="font-semibold text-red-600">({formatCurrency(totalProductionCost)})</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-3">
            <span className="font-bold text-gray-900">Gross Profit</span>
            <span className={`font-bold text-lg ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(grossProfit)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-gray-900">Gross Margin</span>
            <span className={`font-bold text-lg ${marginColor}`}>{formatPercent(grossMargin)}</span>
          </div>
        </div>
      </div>

      {/* AI Advantage */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowAiAdvantage(p => !p)}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
        >
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            AI Advantage — vs. Traditional Agency
          </h3>
          {showAiAdvantage ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showAiAdvantage && (
          <div className="border-t border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Benchmarks based on US mid-tier agency rates for a :{spotLengthSeconds} spot.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
                <div className="text-xs font-medium text-gray-500 mb-1">Traditional Cost</div>
                <div className="text-xl font-bold text-blue-800">{formatCurrency(traditionalTotal)}</div>
                <div className="text-xs text-gray-500 mt-0.5">concept + production + revisions</div>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-center">
                <div className="text-xs font-medium text-gray-500 mb-1">AI-Assisted Cost</div>
                <div className="text-xl font-bold text-green-800">{formatCurrency(totalProductionCost)}</div>
                <div className="text-xs text-gray-500 mt-0.5">your actual cost</div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-center">
                <div className="text-xs font-medium text-gray-500 mb-1">Cost Saved</div>
                <div className="text-xl font-bold text-amber-800">{formatCurrency(traditionalTotal - totalProductionCost)}</div>
                <div className="text-xs text-gray-500 mt-0.5">{formatPercent(costReduction)} reduction</div>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-medium text-gray-500 border-b border-gray-200">
                  <th className="text-left pb-2">Metric</th>
                  <th className="text-right pb-2">Traditional</th>
                  <th className="text-right pb-2">AI-Assisted</th>
                  <th className="text-right pb-2">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2 text-gray-700">Production Cost</td>
                  <td className="py-2 text-right text-red-600">{formatCurrency(traditionalTotal)}</td>
                  <td className="py-2 text-right text-green-600">{formatCurrency(totalProductionCost)}</td>
                  <td className="py-2 text-right font-semibold text-green-700">-{formatCurrency(traditionalTotal - totalProductionCost)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-700">Gross Margin</td>
                  <td className="py-2 text-right text-red-600">{formatPercent(Math.max(0, traditionalMargin))}</td>
                  <td className="py-2 text-right text-green-600">{formatPercent(Math.max(0, grossMargin))}</td>
                  <td className="py-2 text-right font-semibold text-green-700">+{formatPercent(Math.max(0, marginImprovement))}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-700">Time to Storyboard</td>
                  <td className="py-2 text-right text-gray-500">2–3 weeks</td>
                  <td className="py-2 text-right text-green-600">Same day</td>
                  <td className="py-2 text-right font-semibold text-green-700">14–20 days faster</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-700">Variant Cutdowns</td>
                  <td className="py-2 text-right text-gray-500">40–60% of original cost</td>
                  <td className="py-2 text-right text-green-600">{formatCurrency(costs.variantCostEach)} each</td>
                  <td className="py-2 text-right font-semibold text-green-700">~90% cheaper</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-700">Extra Revision Round</td>
                  <td className="py-2 text-right text-gray-500">{formatCurrency(TRADITIONAL.revisionRoundCost)}</td>
                  <td className="py-2 text-right text-green-600">{formatCurrency(costs.revisionRoundCost)}</td>
                  <td className="py-2 text-right font-semibold text-green-700">-{formatPercent((1 - costs.revisionRoundCost / TRADITIONAL.revisionRoundCost) * 100)}</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <strong>Client pitch talking point:</strong> "We deliver the same quality as a top agency at a fraction of the cost, with same-day storyboards and variant cutdowns included — meaning your budget goes further on media placement instead of production."
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
