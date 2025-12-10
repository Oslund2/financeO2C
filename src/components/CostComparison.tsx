import { DollarSign, TrendingDown, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { CostComparison as CostComparisonType } from '../services/costCalculationService';
import { InfoTooltip } from './InfoTooltip';

interface CostComparisonProps {
  comparison: CostComparisonType;
  showDetailed?: boolean;
}

export function CostComparison({ comparison, showDetailed = false }: CostComparisonProps) {
  const { aiCost, traditionalCost, savings, savingsPercentage } = comparison;
  const [showGlossary, setShowGlossary] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-300 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Traditional Animation</h3>
              <p className="text-sm text-gray-600">Manual claymation production</p>
            </div>
          </div>

          <div className="text-3xl font-bold text-gray-700 mb-4">
            {formatCurrency(traditionalCost.totalCost)}
          </div>

          {showDetailed && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-700">
                <span className="flex items-center">
                  Base Cost:
                  <InfoTooltip content="Traditional animation cost per minute including crew salaries, studio time, and materials." />
                </span>
                <span className="font-medium">{formatCurrency(traditionalCost.baseCost)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span className="flex items-center">
                  Acts:
                  <InfoTooltip
                    title="3x AI Cost"
                    content="Manual storyboarding, planning meetings, and setup for each act. Traditional requires significantly more human labor."
                  />
                </span>
                <span className="font-medium">{formatCurrency(traditionalCost.actsCost)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span className="flex items-center">
                  Scenes:
                  <InfoTooltip
                    title="4x AI Cost"
                    content="Physical set construction, lighting setup, camera positioning, and multiple takes for each scene."
                  />
                </span>
                <span className="font-medium">{formatCurrency(traditionalCost.scenesCost)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span className="flex items-center">
                  Characters:
                  <InfoTooltip
                    title="5x AI Cost"
                    content="Physical model creation, armature rigging, costume design, and character maintenance throughout production."
                  />
                </span>
                <span className="font-medium">{formatCurrency(traditionalCost.charactersCost)}</span>
              </div>
              {traditionalCost.complexityAdjustment !== 0 && (
                <div className="flex justify-between text-gray-700">
                  <span className="flex items-center">
                    Complexity Adjustment:
                    <InfoTooltip content="Additional 50% cost for complex scenes requiring extra manual work, precision positioning, and multiple filming attempts." />
                  </span>
                  <span className="font-medium">
                    {formatCurrency(traditionalCost.complexityAdjustment)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Total Savings</h3>
            <p className="text-sm text-gray-600">By using AI-assisted production</p>
          </div>
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
