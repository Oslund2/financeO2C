import { DollarSign, TrendingDown, Sparkles } from 'lucide-react';
import type { CostComparison as CostComparisonType } from '../services/costCalculationService';

interface CostComparisonProps {
  comparison: CostComparisonType;
  showDetailed?: boolean;
}

export function CostComparison({ comparison, showDetailed = false }: CostComparisonProps) {
  const { aiCost, traditionalCost, savings, savingsPercentage } = comparison;

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
            ${aiCost.totalCost.toFixed(2)}
          </div>

          {showDetailed && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-700">
                <span>Base Cost:</span>
                <span className="font-medium">${aiCost.baseCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Acts:</span>
                <span className="font-medium">${aiCost.actsCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Scenes:</span>
                <span className="font-medium">${aiCost.scenesCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Characters:</span>
                <span className="font-medium">${aiCost.charactersCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Voice Lines:</span>
                <span className="font-medium">${aiCost.voicesCost.toFixed(2)}</span>
              </div>
              {aiCost.complexityAdjustment !== 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Complexity Adjustment:</span>
                  <span className="font-medium">
                    {aiCost.complexityAdjustment > 0 ? '+' : ''}
                    ${aiCost.complexityAdjustment.toFixed(2)}
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
            ${traditionalCost.totalCost.toFixed(2)}
          </div>

          {showDetailed && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-700">
                <span>Base Cost:</span>
                <span className="font-medium">${traditionalCost.baseCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Acts:</span>
                <span className="font-medium">${traditionalCost.actsCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Scenes:</span>
                <span className="font-medium">${traditionalCost.scenesCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Characters:</span>
                <span className="font-medium">${traditionalCost.charactersCost.toFixed(2)}</span>
              </div>
              {traditionalCost.complexityAdjustment !== 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Complexity Adjustment:</span>
                  <span className="font-medium">
                    ${traditionalCost.complexityAdjustment.toFixed(2)}
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
            ${savings.toFixed(2)}
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
    </div>
  );
}
