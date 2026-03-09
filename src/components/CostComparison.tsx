import { DollarSign, TrendingDown, Sparkles, ChevronDown, ChevronUp, Info, Users, ArrowDown, UserCog, Clock, Briefcase, Building, Hammer, Loader2, AlertTriangle, BookOpen, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import type { CostComparison as CostComparisonType, HumanCostBreakdown, TraditionalLaborBreakdown, FreelanceCostBreakdown } from '../services/costCalculationService';
import { ANIMATION_STYLE_MULTIPLIERS, PRODUCTION_TIER_PRESETS, FREELANCE_TIER_PRESETS } from '../services/costCalculationService';
import { InfoTooltip } from './InfoTooltip';
import { formatCurrency } from '../services/creatorCostCalculationService';
import { analyzeCostBenchmark, type CostBenchmarkInsight } from '../services/economicsAIService';

interface CostComparisonProps {
  comparison: CostComparisonType;
  showDetailed?: boolean;
}

function HumanCostSection({ humanCosts }: { humanCosts: HumanCostBreakdown }) {
  const decayPercentage = Math.round(humanCosts.decayMultiplier * 100);
  const savingsFromDecay = humanCosts.baseCostBeforeDecay - humanCosts.totalHumanCost;

  return (
    <div className="mt-4 pt-4 border-t border-green-200">
      <div className="flex items-center gap-2 mb-3">
        <UserCog className="w-4 h-4 text-green-700" />
        <span className="font-semibold text-gray-900 text-sm">Human Labor Costs</span>
        {humanCosts.episodeNumber > 1 && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
            <ArrowDown className="w-3 h-3" />
            {decayPercentage}% of base
          </span>
        )}
      </div>

      {humanCosts.episodeNumber > 1 && savingsFromDecay > 0 && (
        <div className="mb-3 p-2 bg-green-100 border border-green-200 rounded-lg">
          <div className="text-xs text-green-800">
            <span className="font-medium">Asset Reuse Savings:</span> {formatCurrency(savingsFromDecay)} saved vs Episode 1
          </div>
          <div className="text-xs text-green-700 mt-1">
            Episode {humanCosts.episodeNumber}: Reusing established character models, backgrounds, and shot compositions
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex justify-between text-gray-700 text-sm">
          <span className="flex items-center">
            Editing Labor:
            <InfoTooltip content="Post-production editing, timeline assembly, pacing adjustments. Decays as templates and workflows become established." />
            {humanCosts.episodeNumber > 1 && <ArrowDown className="w-3 h-3 text-green-600 ml-1" />}
          </span>
          <span className="font-medium">{formatCurrency(humanCosts.editingCost)}</span>
        </div>

        <div className="flex justify-between text-gray-700 text-sm">
          <span className="flex items-center">
            Scene Setup Review:
            <InfoTooltip content="Shot composition verification, camera angles, background review. Decays as asset library grows." />
            {humanCosts.episodeNumber > 1 && <ArrowDown className="w-3 h-3 text-green-600 ml-1" />}
          </span>
          <span className="font-medium">{formatCurrency(humanCosts.sceneSetupCost)}</span>
        </div>

        <div className="flex justify-between text-gray-700 text-sm">
          <span className="flex items-center">
            Character QC:
            <InfoTooltip content="Character consistency checks, expression verification. Decays as models become established." />
            {humanCosts.episodeNumber > 1 && <ArrowDown className="w-3 h-3 text-green-600 ml-1" />}
          </span>
          <span className="font-medium">{formatCurrency(humanCosts.characterQCCost)}</span>
        </div>

        <div className="flex justify-between text-gray-700 text-sm">
          <span className="flex items-center">
            Render Supervision:
            <InfoTooltip content="Technical QC during render process. Flat cost - always required regardless of episode number." />
            <span className="text-xs text-gray-500 ml-1">(flat)</span>
          </span>
          <span className="font-medium">{formatCurrency(humanCosts.renderSupervisionCost)}</span>
        </div>

        <div className="flex justify-between text-gray-700 text-sm">
          <span className="flex items-center">
            Voice Direction:
            <InfoTooltip content="Director time for voice talent guidance. Flat cost per recording session." />
            <span className="text-xs text-gray-500 ml-1">(flat)</span>
          </span>
          <span className="font-medium">{formatCurrency(humanCosts.voiceDirectionCost)}</span>
        </div>

        <div className="flex justify-between text-gray-700 text-sm">
          <span className="flex items-center">
            Revisions:
            <InfoTooltip content="Rework allowance for feedback cycles. Partially decays with experience." />
          </span>
          <span className="font-medium">{formatCurrency(humanCosts.revisionCost)}</span>
        </div>

        <div className="flex justify-between text-gray-900 text-sm pt-2 border-t border-green-200">
          <span className="font-semibold">Total Human Labor:</span>
          <span className="font-bold text-green-700">{formatCurrency(humanCosts.totalHumanCost)}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="bg-green-50 p-2 rounded">
          <div className="text-gray-600">Decaying Costs</div>
          <div className="font-semibold text-green-700">{formatCurrency(humanCosts.decayingCosts)}</div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-gray-600">Flat Costs</div>
          <div className="font-semibold text-gray-700">{formatCurrency(humanCosts.flatCosts)}</div>
        </div>
      </div>
    </div>
  );
}

function TraditionalLaborSection({ labor }: { labor: TraditionalLaborBreakdown }) {
  const styleSettings = ANIMATION_STYLE_MULTIPLIERS[labor.animationStyle];
  const tierSettings = PRODUCTION_TIER_PRESETS[labor.productionTier];

  return (
    <div className="mt-4 pt-4 border-t border-gray-300">
      <div className="flex items-center gap-2 mb-3">
        <Hammer className="w-4 h-4 text-gray-700" />
        <span className="font-semibold text-gray-900 text-sm">Labor Breakdown</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full">
          {styleSettings.name}
        </span>
        <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full">
          {tierSettings.name}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-gray-700 text-sm">
          <span className="flex items-center">
            Animator Labor:
            <InfoTooltip content={`${labor.animatorHours.toLocaleString()} hours at $${labor.animatorHourlyRate}/hr. Based on industry standard of 300-500 hours per minute of animation.`} />
          </span>
          <span className="font-medium">{formatCurrency(labor.animatorLaborCost)}</span>
        </div>

        <div className="flex justify-between text-gray-700 text-sm">
          <span className="flex items-center">
            Physical Materials:
            <InfoTooltip content="Clay, armatures, costumes, and props for each character. Physical models require maintenance throughout production." />
          </span>
          <span className="font-medium">{formatCurrency(labor.materialsCost)}</span>
        </div>

        <div className="flex justify-between text-gray-700 text-sm">
          <span className="flex items-center">
            Set Construction:
            <InfoTooltip content="Physical sets, backgrounds, and miniatures. Each unique location requires custom construction." />
          </span>
          <span className="font-medium">{formatCurrency(labor.setCostTotal)}</span>
        </div>

        <div className="flex justify-between text-gray-700 text-sm">
          <span className="flex items-center">
            Voice Talent:
            <InfoTooltip content="Professional voice actors (SAG rates). Includes recording sessions and direction." />
          </span>
          <span className="font-medium">{formatCurrency(labor.voiceTalentCost)}</span>
        </div>

        <div className="flex justify-between text-gray-700 text-sm">
          <span className="flex items-center">
            Studio Rental:
            <InfoTooltip content={`${labor.studioDays} days of studio time at $${tierSettings.studioDailyRate}/day. Includes equipment and facilities.`} />
          </span>
          <span className="font-medium">{formatCurrency(labor.studioCost)}</span>
        </div>

        <div className="flex justify-between text-gray-700 text-sm">
          <span className="flex items-center">
            Reshoot Contingency:
            <InfoTooltip content="Stop-motion requires complete reshooting for errors. Industry standard is 20-30% contingency." />
          </span>
          <span className="font-medium">{formatCurrency(labor.reshootContingency)}</span>
        </div>

        <div className="flex justify-between text-gray-900 text-sm pt-2 border-t border-gray-300">
          <span className="font-semibold">Total Production:</span>
          <span className="font-bold text-gray-700">{formatCurrency(labor.totalLaborCost)}</span>
        </div>
      </div>

      <div className="mt-3 p-2 bg-gray-100 rounded-lg">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Clock className="w-3 h-3" />
          <span>{labor.animatorHours.toLocaleString()} total animator hours</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {labor.styleMultiplier > 1 ? `${labor.styleMultiplier}x labor multiplier for ${styleSettings.name}` : 'Baseline labor rate'}
        </div>
      </div>
    </div>
  );
}

function FreelanceCostCard({ freelanceCost, showDetailed }: { freelanceCost: FreelanceCostBreakdown; showDetailed: boolean }) {
  const tierSettings = FREELANCE_TIER_PRESETS[freelanceCost.freelanceTier];

  return (
    <div className="bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-cyan-200 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Creator Economy</h3>
          <p className="text-sm text-gray-600">Fiverr / Upwork freelancers</p>
        </div>
      </div>

      <div className="text-3xl font-bold text-cyan-700 mb-4">
        {formatCurrency(freelanceCost.totalCost)}
      </div>

      {showDetailed && (
        <div className="space-y-2 text-sm">
          <div className="mb-3">
            <span className="text-xs px-2 py-1 bg-cyan-100 text-cyan-700 rounded-full">
              {tierSettings.name} ({tierSettings.description})
            </span>
          </div>

          <div className="flex justify-between text-gray-700">
            <span className="flex items-center">
              Labor Cost:
              <InfoTooltip content={`${freelanceCost.laborHours.toLocaleString()} hours at $${freelanceCost.hourlyRate}/hr. Freelancers work faster than traditional studios but still require significant hours.`} />
            </span>
            <span className="font-medium">{formatCurrency(freelanceCost.baseLaborCost)}</span>
          </div>

          <div className="flex justify-between text-gray-700">
            <span className="flex items-center">
              Platform Fees:
              <InfoTooltip content={`${freelanceCost.platformFeePercentage}% platform fee (Fiverr ~20%, Upwork ~10-20%)`} />
            </span>
            <span className="font-medium">{formatCurrency(freelanceCost.platformFees)}</span>
          </div>

          <div className="mt-3 p-2 bg-cyan-100 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-cyan-700">
              <Clock className="w-3 h-3" />
              <span>{freelanceCost.laborHours.toLocaleString()} estimated hours</span>
            </div>
            <div className="text-xs text-cyan-600 mt-1">
              ${freelanceCost.hourlyRate}/hr ({tierSettings.name})
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CostComparison({ comparison, showDetailed = false }: CostComparisonProps) {
  const { aiCost, traditionalCost, freelanceCost, creatorCost, savings, savingsPercentage, savingsVsFreelance, savingsVsFreelancePercentage, savingsVsCreator, savingsVsCreatorPercentage } = comparison;
  const [showGlossary, setShowGlossary] = useState(false);
  const [showCitations, setShowCitations] = useState(false);
  const [aiBenchmark, setAiBenchmark] = useState<CostBenchmarkInsight | null>(null);
  const [aiBenchmarkLoading, setAiBenchmarkLoading] = useState(false);
  const [aiBenchmarkError, setAiBenchmarkError] = useState<string | null>(null);
  const [showAIBenchmark, setShowAIBenchmark] = useState(false);

  const geminiAvailable = !!(import.meta.env.VITE_GEMINI_API_KEY);

  async function handleBenchmarkAnalyze() {
    if (aiBenchmark) { setShowAIBenchmark(v => !v); return; }
    setAiBenchmarkLoading(true);
    setAiBenchmarkError(null);
    setShowAIBenchmark(true);
    try {
      const runtimeMinutes = aiCost.baseCost > 0 ? aiCost.baseCost / 25 : 11; // rough estimate
      const result = await analyzeCostBenchmark({
        aiProductionCost: aiCost.totalCost,
        traditionalCost: traditionalCost.totalCost,
        freelanceCost: freelanceCost?.totalCost ?? null,
        creatorCost: creatorCost?.metrics.totalCreatorCost ?? null,
        runtimeMinutes
      });
      setAiBenchmark(result);
    } catch (e: any) {
      setAiBenchmarkError(e.message ?? 'AI analysis failed');
    } finally {
      setAiBenchmarkLoading(false);
    }
  }

  const columnCount = 2 + (freelanceCost ? 1 : 0) + (creatorCost ? 1 : 0);
  const gridClass = columnCount === 4 ? 'lg:grid-cols-4 md:grid-cols-2' : columnCount === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2';

  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-1 gap-4 ${gridClass}`}>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI-Assisted Production</h3>
              <p className="text-sm text-gray-600">Using Gemini, Veo, ElevenLabs</p>
            </div>
          </div>

          <div className="text-3xl font-bold text-green-700 mb-4">
            {formatCurrency(aiCost.totalCost)}
          </div>

          {showDetailed && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-700">
                <span className="flex items-center">
                  Base Cost:
                  <InfoTooltip content="Cost per minute of runtime multiplied by the episode length. This covers core AI generation services." />
                </span>
                <span className="font-medium">{formatCurrency(aiCost.baseCost)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span className="flex items-center">
                  Acts:
                  <InfoTooltip content="Major structural divisions in your script (Act 1, Act 2, etc.). Each act has setup costs for AI context and scene planning." />
                </span>
                <span className="font-medium">{formatCurrency(aiCost.actsCost)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span className="flex items-center">
                  Scenes:
                  <InfoTooltip content="Individual scenes within acts. Each requires AI image/video generation, camera setup, and rendering." />
                </span>
                <span className="font-medium">{formatCurrency(aiCost.scenesCost)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span className="flex items-center">
                  Characters:
                  <InfoTooltip content="Unique characters in the episode. Each requires character model generation, consistency management, and asset storage." />
                </span>
                <span className="font-medium">{formatCurrency(aiCost.charactersCost)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span className="flex items-center">
                  Voice Lines:
                  <InfoTooltip content="Each line of dialogue spoken by characters. AI voice synthesis costs are calculated per line using ElevenLabs." />
                </span>
                <span className="font-medium">{formatCurrency(aiCost.voicesCost)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span className="flex items-center">
                  Video Generation:
                  <InfoTooltip content="AI video generation cost per minute of finished animation. Converts storyboard images into fully animated video sequences." />
                </span>
                <span className="font-medium">{formatCurrency(aiCost.videoGenerationCost || 0)}</span>
              </div>
              {aiCost.complexityAdjustment !== 0 && (
                <div className="flex justify-between text-gray-700">
                  <span className="flex items-center">
                    Complexity Adjustment:
                    <InfoTooltip content="Additional costs for complex scenes with multiple characters, elaborate settings, or dynamic action sequences." />
                  </span>
                  <span className="font-medium">
                    {aiCost.complexityAdjustment > 0 ? '+' : ''}
                    {formatCurrency(aiCost.complexityAdjustment)}
                  </span>
                </div>
              )}

              {aiCost.humanCosts && (
                <HumanCostSection humanCosts={aiCost.humanCosts} />
              )}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-300 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Traditional Studio</h3>
              <p className="text-sm text-gray-600">Professional animation studio</p>
            </div>
          </div>

          <div className="text-3xl font-bold text-gray-700 mb-4">
            {formatCurrency(traditionalCost.totalCost)}
          </div>

          {showDetailed && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-700">
                <span className="flex items-center">
                  Animator Labor:
                  <InfoTooltip content="Professional animators working frame-by-frame. Stop-motion requires 300-500 hours per minute of animation." />
                </span>
                <span className="font-medium">{formatCurrency(traditionalCost.baseCost)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span className="flex items-center">
                  Set Construction:
                  <InfoTooltip content="Physical sets, backgrounds, and miniatures for each unique location." />
                </span>
                <span className="font-medium">{formatCurrency(traditionalCost.scenesCost)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span className="flex items-center">
                  Physical Materials:
                  <InfoTooltip content="Clay, armatures, costumes, and props for each character." />
                </span>
                <span className="font-medium">{formatCurrency(traditionalCost.charactersCost)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span className="flex items-center">
                  Voice Talent:
                  <InfoTooltip content="Professional voice actors at SAG rates." />
                </span>
                <span className="font-medium">{formatCurrency(traditionalCost.voicesCost)}</span>
              </div>
              {traditionalCost.complexityAdjustment !== 0 && (
                <div className="flex justify-between text-gray-700">
                  <span className="flex items-center">
                    Studio & Contingency:
                    <InfoTooltip content="Studio rental, equipment, and reshoot contingency (25-30% for stop-motion errors)." />
                  </span>
                  <span className="font-medium">
                    {formatCurrency(traditionalCost.complexityAdjustment)}
                  </span>
                </div>
              )}

              {traditionalCost.traditionalLabor && (
                <TraditionalLaborSection labor={traditionalCost.traditionalLabor} />
              )}
            </div>
          )}
        </div>

        {freelanceCost && (
          <FreelanceCostCard freelanceCost={freelanceCost} showDetailed={showDetailed} />
        )}

        {creatorCost && (
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Creator Labor</h3>
                <p className="text-sm text-gray-600">Traditional studio production</p>
              </div>
            </div>

            <div className="text-3xl font-bold text-orange-700 mb-4">
              {formatCurrency(creatorCost.metrics.totalCreatorCost)}
            </div>

            {showDetailed && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-700">
                  <span className="flex items-center">
                    Base Labor:
                    <InfoTooltip content="Core production labor cost based on artist hours and hourly rates." />
                  </span>
                  <span className="font-medium">{formatCurrency(creatorCost.metrics.baseLaborCost)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span className="flex items-center">
                    Pre/Post Production:
                    <InfoTooltip content="Storyboarding, planning, editing, compositing, and final polish." />
                  </span>
                  <span className="font-medium">
                    {formatCurrency(creatorCost.metrics.preproductionCost + creatorCost.metrics.postproductionCost)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span className="flex items-center">
                    Revisions & PM:
                    <InfoTooltip content="Feedback cycles, revisions, and project management overhead." />
                  </span>
                  <span className="font-medium">
                    {formatCurrency(creatorCost.metrics.revisionCost + creatorCost.metrics.projectManagementCost)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span className="flex items-center">
                    Overhead:
                    <InfoTooltip content="Benefits, insurance, payroll taxes, and general overhead costs." />
                  </span>
                  <span className="font-medium">{formatCurrency(creatorCost.metrics.overheadCost)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span className="flex items-center">
                    Facility & Equipment:
                    <InfoTooltip content="Software licenses, equipment, and studio space costs for all artists." />
                  </span>
                  <span className="font-medium">{formatCurrency(creatorCost.metrics.totalFacilityCost)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Total Savings</h3>
              <p className="text-sm text-gray-600">By using AI-assisted production</p>
            </div>
          </div>
          {geminiAvailable && (
            <button
              onClick={handleBenchmarkAnalyze}
              disabled={aiBenchmarkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {aiBenchmarkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiBenchmark ? (showAIBenchmark ? 'Hide' : 'AI Benchmark') : 'AI Benchmark'}
            </button>
          )}
        </div>

        <div className="flex items-baseline gap-3">
          <div className="text-4xl font-bold text-blue-700">
            {formatCurrency(savings)}
          </div>
          <div className="text-2xl font-semibold text-blue-600">
            ({savingsPercentage.toFixed(1)}% savings)
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-blue-200">
          <p className="text-sm text-gray-700">
            AI-powered production reduces costs through automated script generation, voice synthesis,
            and image/video generation while maintaining professional quality standards.
          </p>
        </div>

        {(freelanceCost || creatorCost) && (
          <div className="mt-4 pt-4 border-t border-blue-200 space-y-3">
            {freelanceCost && savingsVsFreelance !== undefined && savingsVsFreelancePercentage !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">vs Freelancers (Fiverr/Upwork):</span>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-700">{formatCurrency(savingsVsFreelance)}</div>
                  <div className="text-sm text-blue-600">({savingsVsFreelancePercentage.toFixed(1)}% savings)</div>
                </div>
              </div>
            )}
            {creatorCost && savingsVsCreator !== undefined && savingsVsCreatorPercentage !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">vs In-House Creator Team:</span>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-700">{formatCurrency(savingsVsCreator)}</div>
                  <div className="text-sm text-blue-600">({savingsVsCreatorPercentage.toFixed(1)}% savings)</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Cost Benchmark Panel */}
      {showAIBenchmark && (
        <div className="border border-purple-200 rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-sm font-semibold text-white">AI Cost Benchmark — 2024/2025 Industry Comparison</span>
          </div>
          <div className="p-4 bg-purple-50 space-y-4">
            {aiBenchmarkLoading && (
              <div className="flex items-center gap-2 text-purple-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Benchmarking against latest industry data...</span>
              </div>
            )}
            {aiBenchmarkError && (
              <div className="flex items-start gap-2 text-red-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{aiBenchmarkError}</span>
              </div>
            )}
            {aiBenchmark && !aiBenchmarkLoading && (
              <>
                <div>
                  <p className="text-sm font-medium text-purple-900 mb-1">Benchmark Assessment</p>
                  <p className="text-sm text-gray-700">{aiBenchmark.benchmarkAssessment}</p>
                </div>
                {aiBenchmark.marketComparison.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-purple-900 mb-1">Market Comparisons</p>
                    <ul className="space-y-1">
                      {aiBenchmark.marketComparison.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-purple-500 mt-0.5">•</span>{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiBenchmark.optimisationOpportunities.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-purple-900 mb-1">Optimisation Opportunities</p>
                    <ul className="space-y-1">
                      {aiBenchmark.optimisationOpportunities.map((o, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-indigo-500 font-bold mt-0.5">→</span>{o}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiBenchmark.competitivePosition && (
                  <div className="bg-white border border-purple-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-purple-700 mb-1">Competitive Position</p>
                    <p className="text-sm text-gray-700">{aiBenchmark.competitivePosition}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Data Sources & Assumptions */}
      <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowCitations(!showCitations)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-gray-900">Data Sources & Assumptions</h3>
          </div>
          {showCitations ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {showCitations && (
          <div className="px-6 pb-6 space-y-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mt-4">All cost benchmarks are based on publicly available 2024–2025 industry data. Actual costs vary by studio, geography, and project complexity.</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  AI-Assisted Production
                </h4>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="bg-green-50 rounded-lg p-2.5">
                    <div className="font-medium text-gray-700 mb-1">AI Tool Pricing</div>
                    <ul className="space-y-0.5">
                      <li>• <span className="font-medium">Gemini/LLM scripting:</span> ~$0.002–0.01/1K tokens (Google AI Pricing, 2025)</li>
                      <li>• <span className="font-medium">ElevenLabs voice synthesis:</span> ~$0.30/1K characters, Pro tier (ElevenLabs.io pricing, 2024)</li>
                      <li>• <span className="font-medium">Veo / Runway video gen:</span> ~$0.05–0.12/second of video (Google Veo & Runway ML pricing, 2024–2025)</li>
                      <li>• <span className="font-medium">Midjourney / DALL-E image gen:</span> ~$0.04–0.08/image at Pro tier (vendor pricing sheets, 2024)</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2.5">
                    <div className="font-medium text-gray-700 mb-1">Human Oversight Labour</div>
                    <ul className="space-y-0.5">
                      <li>• <span className="font-medium">Post-production editor:</span> $35–75/hr (BLS Occupational Outlook, 2024; Animation Guild CBA 2023)</li>
                      <li>• <span className="font-medium">Voice director:</span> $50–100/hr (IATSE Local 700 / SAG-AFTRA scale, 2024)</li>
                      <li>• <span className="font-medium">Asset decay / reuse:</span> Assumes 15–25% cost reduction per episode from asset library reuse (internal modelling based on Nickelodeon/Disney pipeline studies)</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  Traditional & Freelance Production
                </h4>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="font-medium text-gray-700 mb-1">Traditional Studio Costs</div>
                    <ul className="space-y-0.5">
                      <li>• <span className="font-medium">2D TV animation:</span> $100K–500K per half-hour (Variety, "Animation Cost Report", 2024; MIPCOM budgets)</li>
                      <li>• <span className="font-medium">Stop-motion / claymation:</span> 2–4× 2D rates ($200K–2M/ep); based on Laika, Mackinnon & Saunders disclosed budgets</li>
                      <li>• <span className="font-medium">Animator hours:</span> 300–500 hrs/minute of animation (Animation Guild production standards; TAG CBA 2023)</li>
                      <li>• <span className="font-medium">SAG-AFTRA voice rates:</span> $926/4-hr session minimum (SAG-AFTRA Commercials Contract 2024)</li>
                      <li>• <span className="font-medium">Studio daily rate:</span> $800–2,500/day (Variety studio rental surveys, LA/NYC 2024)</li>
                      <li>• <span className="font-medium">Reshoot contingency:</span> 20–30% for physical production (industry standard; Producers Guild risk guidelines)</li>
                    </ul>
                  </div>
                  <div className="bg-cyan-50 rounded-lg p-2.5">
                    <div className="font-medium text-gray-700 mb-1">Freelance / Creator Economy</div>
                    <ul className="space-y-0.5">
                      <li>• <span className="font-medium">Fiverr platform fee:</span> 20% on orders up to $500; 15% above (Fiverr Terms of Service, 2024)</li>
                      <li>• <span className="font-medium">Upwork platform fee:</span> 10% sliding scale (Upwork Service Fees, 2024)</li>
                      <li>• <span className="font-medium">Freelance animator hourly:</span> $15–80/hr depending on tier (Upwork Animation Category data, 2024)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 pt-2 border-t border-gray-100">
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span>Sources: Animation Guild CBA 2023, SAG-AFTRA 2024, BLS.gov, Variety Intelligence Platform, Fiverr/Upwork pricing pages, Google AI / ElevenLabs / Runway ML vendor pricing (2024–2025). Costs updated periodically — verify current vendor rates before budgeting.</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowGlossary(!showGlossary)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Understanding Production Costs</h3>
          </div>
          {showGlossary ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showGlossary && (
          <div className="px-6 pb-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  AI-Assisted Production
                </h4>

                <div>
                  <div className="font-medium text-sm text-gray-800">Base Cost</div>
                  <p className="text-sm text-gray-600">
                    Calculated per minute of runtime using AI generation services (Gemini, Veo).
                    Includes all core processing and rendering costs.
                  </p>
                </div>

                <div>
                  <div className="font-medium text-sm text-gray-800">Acts</div>
                  <p className="text-sm text-gray-600">
                    Major story divisions (Act 1, Act 2, etc.). AI needs context setup for each act
                    to maintain narrative consistency and character continuity.
                  </p>
                </div>

                <div>
                  <div className="font-medium text-sm text-gray-800">Scenes</div>
                  <p className="text-sm text-gray-600">
                    Individual scenes requiring image/video generation. Each scene needs unique
                    visual generation, camera angles, and composition.
                  </p>
                </div>

                <div>
                  <div className="font-medium text-sm text-gray-800">Characters</div>
                  <p className="text-sm text-gray-600">
                    Unique characters require initial model generation and consistency management
                    across all scenes. More characters = higher costs.
                  </p>
                </div>

                <div>
                  <div className="font-medium text-sm text-gray-800">Voice Lines</div>
                  <p className="text-sm text-gray-600">
                    Each dialogue line uses AI voice synthesis (ElevenLabs). Cost is per line
                    generated, making longer conversations more expensive.
                  </p>
                </div>

                <div>
                  <div className="font-medium text-sm text-gray-800">Video Generation</div>
                  <p className="text-sm text-gray-600">
                    AI video generation cost per minute of finished animation. Transforms storyboard
                    images into smooth, fully animated video sequences with character movement and scene transitions.
                  </p>
                </div>

                <div>
                  <div className="font-medium text-sm text-gray-800">Complexity Adjustment</div>
                  <p className="text-sm text-gray-600">
                    Scenes with keywords like "elaborate," "dynamic," or "action" trigger higher
                    multipliers (up to 1.5x) for additional processing requirements.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  Traditional Animation
                </h4>

                <div>
                  <div className="font-medium text-sm text-gray-800">Base Cost</div>
                  <p className="text-sm text-gray-600">
                    Includes animator salaries, studio rental, equipment, materials, and overhead.
                    Traditional claymation is labor-intensive and time-consuming.
                  </p>
                </div>

                <div>
                  <div className="font-medium text-sm text-gray-800">Acts (3x AI Cost)</div>
                  <p className="text-sm text-gray-600">
                    Requires extensive planning meetings, manual storyboarding, set design, and
                    coordination across teams for each act.
                  </p>
                </div>

                <div>
                  <div className="font-medium text-sm text-gray-800">Scenes (4x AI Cost)</div>
                  <p className="text-sm text-gray-600">
                    Physical set construction, lighting setup, camera positioning, and frame-by-frame
                    animation. Each scene requires multiple shooting days.
                  </p>
                </div>

                <div>
                  <div className="font-medium text-sm text-gray-800">Characters (5x AI Cost)</div>
                  <p className="text-sm text-gray-600">
                    Physical model sculpting, armature creation, costume fabrication, and ongoing
                    maintenance. Each character is a significant investment.
                  </p>
                </div>

                <div>
                  <div className="font-medium text-sm text-gray-800">Complexity Adjustment (50%)</div>
                  <p className="text-sm text-gray-600">
                    Complex scenes require additional filming time, more precise positioning,
                    special effects, and often multiple takes to achieve desired results.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">Key Insight</h4>
              <p className="text-sm text-gray-600">
                AI-assisted production dramatically reduces costs by automating time-intensive tasks
                like character creation, scene generation, and voice acting. While traditional animation
                requires physical materials and extensive manual labor, AI can generate similar quality
                outputs in a fraction of the time at a fraction of the cost.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
