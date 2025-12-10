import { useState, useEffect } from 'react';
import { Users, Clock, DollarSign, TrendingUp, Info, Settings as SettingsIcon, BarChart3 } from 'lucide-react';
import {
  calculateCreatorCosts,
  formatCurrency,
  formatHours,
  type CreatorCostBreakdown,
  type CreatorCostConfig,
} from '../services/creatorCostCalculationService';
import { InfoTooltip } from './InfoTooltip';
import { LaborCostBreakdown } from './LaborCostBreakdown';

interface CreatorCostCalculatorProps {
  seriesId: string | null;
  onCalculationsChange?: (breakdown: CreatorCostBreakdown) => void;
}

export function CreatorCostCalculator({ seriesId, onCalculationsChange }: CreatorCostCalculatorProps) {
  const [scenesPerEpisode, setScenesPerEpisode] = useState(165);
  const [artistsPerScene, setArtistsPerScene] = useState(4);
  const [timePerSceneHours, setTimePerSceneHours] = useState(1.0);
  const [productionDays, setProductionDays] = useState(10);
  const [workingHoursPerDay, setWorkingHoursPerDay] = useState(8);
  const [artistAnnualSalary, setArtistAnnualSalary] = useState(75000);
  const [overheadPercentage, setOverheadPercentage] = useState(25);
  const [preproductionPercentage, setPreproductionPercentage] = useState(15);
  const [postproductionPercentage, setPostproductionPercentage] = useState(20);
  const [revisionBufferPercentage, setRevisionBufferPercentage] = useState(10);
  const [projectManagementPercentage, setProjectManagementPercentage] = useState(15);
  const [softwareCostPerMonth, setSoftwareCostPerMonth] = useState(100);
  const [equipmentCostPerMonth, setEquipmentCostPerMonth] = useState(200);
  const [studioSpaceCostPerMonth, setStudioSpaceCostPerMonth] = useState(300);

  const [breakdown, setBreakdown] = useState<CreatorCostBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    calculateCosts();
  }, [
    scenesPerEpisode,
    artistsPerScene,
    timePerSceneHours,
    productionDays,
    workingHoursPerDay,
    artistAnnualSalary,
    overheadPercentage,
    preproductionPercentage,
    postproductionPercentage,
    revisionBufferPercentage,
    projectManagementPercentage,
    softwareCostPerMonth,
    equipmentCostPerMonth,
    studioSpaceCostPerMonth,
    seriesId,
  ]);

  const calculateCosts = async () => {
    setLoading(true);
    try {
      const overrides: Partial<CreatorCostConfig> = {
        scenes_per_episode: scenesPerEpisode,
        artists_per_scene: artistsPerScene,
        time_per_scene_hours: timePerSceneHours,
        production_days: productionDays,
        working_hours_per_day: workingHoursPerDay,
        artist_annual_salary: artistAnnualSalary,
        overhead_percentage: overheadPercentage,
        preproduction_percentage: preproductionPercentage,
        postproduction_percentage: postproductionPercentage,
        revision_buffer_percentage: revisionBufferPercentage,
        project_management_percentage: projectManagementPercentage,
        software_cost_per_artist_monthly: softwareCostPerMonth,
        equipment_cost_per_artist_monthly: equipmentCostPerMonth,
        studio_space_cost_per_artist_monthly: studioSpaceCostPerMonth,
      };

      const result = await calculateCreatorCosts(seriesId, overrides);
      setBreakdown(result);

      if (onCalculationsChange) {
        onCalculationsChange(result);
      }
    } catch (error) {
      console.error('Error calculating creator costs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Creator Labor Costs</h3>
            <p className="text-sm text-gray-600">Labor-based production cost modeling</p>
          </div>
        </div>

        {breakdown && (
          <div className="text-3xl font-bold text-orange-700 mb-4">
            {formatCurrency(breakdown.metrics.totalCreatorCost)}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Artists Needed</div>
            <div className="text-xl font-bold text-gray-900">
              {breakdown?.metrics.artistsNeeded || 0}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Total Hours</div>
            <div className="text-xl font-bold text-gray-900">
              {breakdown?.metrics.totalSceneHours.toFixed(0) || 0}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Scenes/Day</div>
            <div className="text-xl font-bold text-gray-900">
              {breakdown?.metrics.scenesPerDay.toFixed(1) || 0}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Hourly Rate</div>
            <div className="text-xl font-bold text-gray-900">
              ${breakdown?.metrics.artistHourlyRate.toFixed(2) || 0}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5" />
          Scene & Production Metrics
        </h4>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                Scenes per Episode
                <InfoTooltip content="Total number of scenes in a typical episode. More scenes = more work." />
              </label>
              <span className="text-sm font-bold text-gray-900">{scenesPerEpisode}</span>
            </div>
            <input
              type="range"
              min="1"
              max="500"
              value={scenesPerEpisode}
              onChange={(e) => setScenesPerEpisode(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                Artists per Scene
                <InfoTooltip content="Average number of artists working on each scene simultaneously." />
              </label>
              <span className="text-sm font-bold text-gray-900">{artistsPerScene.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="1"
              max="6"
              step="0.5"
              value={artistsPerScene}
              onChange={(e) => setArtistsPerScene(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                Time per Scene (hours)
                <InfoTooltip content="Average hours needed to complete one scene with the specified artist count." />
              </label>
              <span className="text-sm font-bold text-gray-900">{timePerSceneHours.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              step="0.25"
              value={timePerSceneHours}
              onChange={(e) => setTimePerSceneHours(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                Production Days
                <InfoTooltip content="Number of working days allocated for main production phase." />
              </label>
              <span className="text-sm font-bold text-gray-900">{productionDays}</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              value={productionDays}
              onChange={(e) => setProductionDays(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                Working Hours per Day
                <InfoTooltip content="Standard work day length for sustainable production." />
              </label>
              <span className="text-sm font-bold text-gray-900">{workingHoursPerDay}</span>
            </div>
            <input
              type="range"
              min="4"
              max="12"
              value={workingHoursPerDay}
              onChange={(e) => setWorkingHoursPerDay(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Labor Cost Parameters
        </h4>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1">
              Artist Annual Salary
              <InfoTooltip content="Average annual salary per artist. Used to calculate hourly rate (÷ 2080 hours)." />
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={artistAnnualSalary}
                onChange={(e) => setArtistAnnualSalary(Number(e.target.value))}
                min="0"
                step="1000"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                Overhead Percentage
                <InfoTooltip content="Benefits, insurance, payroll taxes, and general overhead." />
              </label>
              <span className="text-sm font-bold text-gray-900">{overheadPercentage}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={overheadPercentage}
              onChange={(e) => setOverheadPercentage(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Production Phase Multipliers
        </h4>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                Preproduction
                <InfoTooltip content="Storyboarding, planning, asset preparation as % of production time." />
              </label>
              <span className="text-sm font-bold text-gray-900">{preproductionPercentage}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={preproductionPercentage}
              onChange={(e) => setPreproductionPercentage(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                Postproduction
                <InfoTooltip content="Editing, compositing, color correction, polish as % of production time." />
              </label>
              <span className="text-sm font-bold text-gray-900">{postproductionPercentage}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              value={postproductionPercentage}
              onChange={(e) => setPostproductionPercentage(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                Revision Buffer
                <InfoTooltip content="Time for feedback cycles and revisions as % of production time." />
              </label>
              <span className="text-sm font-bold text-gray-900">{revisionBufferPercentage}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              value={revisionBufferPercentage}
              onChange={(e) => setRevisionBufferPercentage(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                Project Management
                <InfoTooltip content="Coordination, meetings, planning as % of production time." />
              </label>
              <span className="text-sm font-bold text-gray-900">{projectManagementPercentage}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={projectManagementPercentage}
              onChange={(e) => setProjectManagementPercentage(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Facility & Equipment Costs (per artist per month)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1">
              Software Licenses
              <InfoTooltip content="Adobe CC, Toon Boom, etc." />
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={softwareCostPerMonth}
                onChange={(e) => setSoftwareCostPerMonth(Number(e.target.value))}
                min="0"
                step="10"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1">
              Equipment
              <InfoTooltip content="Amortized hardware costs." />
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={equipmentCostPerMonth}
                onChange={(e) => setEquipmentCostPerMonth(Number(e.target.value))}
                min="0"
                step="10"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1">
              Studio Space
              <InfoTooltip content="Rent, utilities, furniture." />
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={studioSpaceCostPerMonth}
                onChange={(e) => setStudioSpaceCostPerMonth(Number(e.target.value))}
                min="0"
                step="10"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {breakdown && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center justify-between w-full mb-4"
          >
            <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Detailed Cost Breakdown
            </h4>
            <span className="text-sm text-gray-600">{showBreakdown ? 'Hide' : 'Show'}</span>
          </button>

          {showBreakdown && <LaborCostBreakdown breakdown={breakdown} />}
        </div>
      )}
    </div>
  );
}
