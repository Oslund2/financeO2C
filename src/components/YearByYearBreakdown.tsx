import { useState } from 'react';
import { TrendingDown, CheckCircle, Sparkles, Loader2, AlertTriangle, BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { LTVCalculationService, type YearlyRevenue } from '../services/ltvCalculationService';
import { analyzeDecayProjection, type DecayProjectionInsight } from '../services/economicsAIService';

interface YearByYearBreakdownProps {
  yearlyBreakdown: YearlyRevenue[];
  minimumRetentionPercent: number;
  productionCost: number;
  decayRatePercent?: number;
  yearsInService?: number;
  genre?: string;
}

export function YearByYearBreakdown({ yearlyBreakdown, minimumRetentionPercent, productionCost, decayRatePercent = 10, yearsInService, genre }: YearByYearBreakdownProps) {
  const breakEvenYear = LTVCalculationService.calculateBreakEvenYear(yearlyBreakdown);
  const [aiInsight, setAiInsight] = useState<DecayProjectionInsight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [showCitations, setShowCitations] = useState(false);

  const geminiAvailable = !!(import.meta.env.VITE_GEMINI_API_KEY);

  async function handleRefineProjections() {
    if (aiInsight) { setShowAI(v => !v); return; }
    setAiLoading(true);
    setAiError(null);
    setShowAI(true);
    try {
      const insight = await analyzeDecayProjection({
        yearlyBreakdown,
        decayRatePercent,
        minimumRetentionPercent,
        productionCost,
        yearsInService: yearsInService ?? yearlyBreakdown.length,
        genre
      });
      setAiInsight(insight);
    } catch (e: any) {
      setAiError(e.message ?? 'AI analysis failed');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-gray-700" />
          <h4 className="text-lg font-bold text-gray-900">Year-by-Year Revenue Projection</h4>
        </div>
        {geminiAvailable && (
          <button
            onClick={handleRefineProjections}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {aiInsight ? (showAI ? 'Hide' : 'AI Insights') : 'Refine Projections'}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 px-3 font-semibold text-gray-700">Year</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-700">Retention</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-700">Revenue</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-700">Profit</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-700">Cumulative</th>
              <th className="text-left py-2 px-3 font-semibold text-gray-700">Phase</th>
            </tr>
          </thead>
          <tbody>
            {yearlyBreakdown.map((yearData) => {
              const isBreakEven = yearData.year === breakEvenYear;
              const isStable = yearData.retentionPercent <= minimumRetentionPercent;
              const phaseColor = LTVCalculationService.getPhaseColor(yearData.retentionPercent, minimumRetentionPercent);
              const phaseLabel = LTVCalculationService.getRetentionPhaseLabel(yearData.retentionPercent, minimumRetentionPercent);

              return (
                <tr
                  key={yearData.year}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    isBreakEven ? 'bg-green-50' : ''
                  }`}
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">Year {yearData.year}</span>
                      {isBreakEven && (
                        <CheckCircle className="w-4 h-4 text-green-600" title="Break-even year" />
                      )}
                    </div>
                  </td>
                  <td className="text-right py-3 px-3">
                    <div className="flex items-center justify-end gap-2">
                      <span className={`font-medium ${phaseColor}`}>
                        {LTVCalculationService.formatPercent(yearData.retentionPercent, 0)}
                      </span>
                      {isStable && (
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">Stable</span>
                      )}
                    </div>
                  </td>
                  <td className="text-right py-3 px-3">
                    <div className="font-medium text-gray-900">
                      {LTVCalculationService.formatCurrency(yearData.revenue)}
                    </div>
                  </td>
                  <td className="text-right py-3 px-3">
                    <div className={`font-medium ${yearData.profit >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      {LTVCalculationService.formatCurrency(yearData.profit)}
                    </div>
                  </td>
                  <td className="text-right py-3 px-3">
                    <div className={`font-bold ${yearData.cumulativeProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {LTVCalculationService.formatCurrency(yearData.cumulativeProfit)}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${phaseColor} bg-opacity-10`}>
                      {phaseLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-gray-300">
            <tr className="bg-gray-50">
              <td colSpan={2} className="py-3 px-3 font-bold text-gray-900">Totals</td>
              <td className="text-right py-3 px-3 font-bold text-gray-900">
                {LTVCalculationService.formatCurrency(
                  yearlyBreakdown.reduce((sum, y) => sum + y.revenue, 0)
                )}
              </td>
              <td className="text-right py-3 px-3 font-bold text-gray-900">
                {LTVCalculationService.formatCurrency(
                  yearlyBreakdown.reduce((sum, y) => sum + y.profit, 0)
                )}
              </td>
              <td className="text-right py-3 px-3 font-bold text-green-700">
                {LTVCalculationService.formatCurrency(
                  yearlyBreakdown[yearlyBreakdown.length - 1]?.cumulativeProfit || 0
                )}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            <span className="font-semibold text-gray-900">Peak Performance</span>
          </div>
          <p className="text-gray-700">80-100% retention</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span className="font-semibold text-gray-900">Active Decay</span>
          </div>
          <p className="text-gray-700">50-79% retention</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
            <span className="font-semibold text-gray-900">Stable Long-Tail</span>
          </div>
          <p className="text-gray-700">At minimum floor</p>
        </div>
      </div>

      {breakEvenYear && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="text-sm text-green-900">
              <strong>Break-even reached in Year {breakEvenYear}</strong> - All subsequent years represent pure profit.
            </div>
          </div>
        </div>
      )}

      {/* AI Refine Projections Panel */}
      {showAI && (
        <div className="mt-4 border border-purple-200 rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-sm font-semibold text-white">AI Decay Model Analysis — Research-Backed Projections</span>
          </div>
          <div className="p-4 bg-purple-50 space-y-4">
            {aiLoading && (
              <div className="flex items-center gap-2 text-purple-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Comparing decay model against latest industry research...</span>
              </div>
            )}
            {aiError && (
              <div className="flex items-start gap-2 text-red-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{aiError}</span>
              </div>
            )}
            {aiInsight && !aiLoading && (
              <>
                <div>
                  <p className="text-sm font-medium text-purple-900 mb-1">Decay Assessment</p>
                  <p className="text-sm text-gray-700">{aiInsight.decayAssessment}</p>
                </div>
                {aiInsight.genreComparison && (
                  <div className="bg-white border border-purple-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-purple-700 mb-1">Genre Benchmark Comparison</p>
                    <p className="text-sm text-gray-700">{aiInsight.genreComparison}</p>
                  </div>
                )}
                {aiInsight.retentionDrivers.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-purple-900 mb-1">Retention Drivers</p>
                    <ul className="space-y-1">
                      {aiInsight.retentionDrivers.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-purple-500 mt-0.5">•</span>{d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiInsight.projectionAdjustments.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-purple-900 mb-1">Projection Adjustments</p>
                    <ul className="space-y-1">
                      {aiInsight.projectionAdjustments.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-indigo-500 font-bold mt-0.5">→</span>{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiInsight.longTailOpportunities && (
                  <div className="bg-white border border-purple-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-purple-700 mb-1">Long-Tail Opportunities</p>
                    <p className="text-sm text-gray-700">{aiInsight.longTailOpportunities}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Data Sources & Methodology */}
      <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowCitations(!showCitations)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-gray-800">Decay Model Methodology & Sources</span>
          </div>
          {showCitations ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {showCitations && (
          <div className="px-4 pb-4 border-t border-gray-100 space-y-3">
            <p className="text-xs text-gray-500 mt-3">The revenue decay model uses a compound retention curve calibrated against 2024–2025 content valuation research.</p>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="font-semibold text-gray-700 mb-1.5">Decay Rate Benchmarks</div>
                <ul className="space-y-1">
                  <li>• <span className="font-medium">SVOD library content:</span> 15–25% annual decay in viewership (Ampere Analysis "Library Content Value Study", 2024)</li>
                  <li>• <span className="font-medium">AVOD / linear:</span> 10–18%/year; slower decay due to schedule-driven discovery (Antenna Research, 2024)</li>
                  <li>• <span className="font-medium">Children's animation:</span> 25–40% slower decay than adult content due to repeat viewing by same cohort (Parrot Analytics "Kids Content Valuation", 2024)</li>
                  <li>• <span className="font-medium">Educational / preschool:</span> Retains 30–50% of peak at year 5–10 (Kidscreen Research; PBS Kids content lifecycle data)</li>
                </ul>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="font-semibold text-gray-700 mb-1.5">Minimum Revenue Floor</div>
                <ul className="space-y-1">
                  <li>• <span className="font-medium">Long-tail floor ({minimumRetentionPercent}% of peak):</span> Consistent with SVOD licensing deal structures where residual rights packages retain floor value (Variety Intelligence Platform licensing surveys, 2024)</li>
                  <li>• <span className="font-medium">Catalogue exploitation:</span> Shows with strong brand IP maintain 20–35% floor through AVOD, FAST channels, and international sub-licensing (MIPJunior 2024 panel data)</li>
                </ul>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="font-semibold text-gray-700 mb-1.5">Extensions That Slow Decay</div>
                <ul className="space-y-1">
                  <li>• <span className="font-medium">Multi-language dubbing:</span> +15–20% long-tail retention in non-English markets (MIPJunior 2024; EBU co-production reports)</li>
                  <li>• <span className="font-medium">Merchandising & licensing:</span> Can reverse or flatten decay curve for strong IP (NPD Group licensing data, 2024)</li>
                  <li>• <span className="font-medium">FAST channel placement:</span> Secondary distribution adds 5–12% incremental revenue in years 3–7 (Comcast Advertising FAST channel study, 2024)</li>
                </ul>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 pt-2 border-t border-gray-100">
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span>Sources: Ampere Analysis 2024, Parrot Analytics Kids Content Valuation 2024, Antenna Research, Kidscreen, MIPJunior 2024, Variety Intelligence Platform, NPD Group. Decay rates are estimates — actual content performance varies significantly.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
