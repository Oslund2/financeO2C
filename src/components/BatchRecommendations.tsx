import React, { useState } from 'react';
import { Package, Check, AlertCircle, DollarSign, Clock, Film } from 'lucide-react';
import { createBatchFromRecommendation, createAllRecommendedBatches, BatchRecommendation } from '../services/batchRecommendationService';

interface BatchRecommendationsProps {
  recommendations: BatchRecommendation[];
  episodeId?: string;
  seriesId: string;
  organizationId: string;
}

export default function BatchRecommendations({
  recommendations,
  episodeId,
  seriesId,
  organizationId
}: BatchRecommendationsProps) {
  const [selectedBatches, setSelectedBatches] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [createdBatches, setCreatedBatches] = useState<Set<number>>(new Set());

  const toggleBatchSelection = (index: number) => {
    const newSelected = new Set(selectedBatches);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedBatches(newSelected);
  };

  const selectAll = () => {
    setSelectedBatches(new Set(recommendations.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedBatches(new Set());
  };

  const handleCreateBatch = async (recommendation: BatchRecommendation, index: number) => {
    if (!episodeId) {
      alert('Please create an episode first before creating batches');
      return;
    }

    setLoading(true);
    try {
      await createBatchFromRecommendation(recommendation, episodeId, seriesId, organizationId);
      setCreatedBatches(new Set([...createdBatches, index]));
      alert('Batch created successfully!');
    } catch (err) {
      console.error('Error creating batch:', err);
      alert('Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSelectedBatches = async () => {
    if (!episodeId) {
      alert('Please create an episode first before creating batches');
      return;
    }

    if (selectedBatches.size === 0) {
      alert('Please select at least one batch');
      return;
    }

    setLoading(true);
    try {
      const selectedRecs = Array.from(selectedBatches).map(i => recommendations[i]);
      await createAllRecommendedBatches(selectedRecs, episodeId, seriesId, organizationId);
      setCreatedBatches(new Set([...createdBatches, ...selectedBatches]));
      setSelectedBatches(new Set());
      alert(`Successfully created ${selectedRecs.length} batches!`);
    } catch (err) {
      console.error('Error creating batches:', err);
      alert('Failed to create batches');
    } finally {
      setLoading(false);
    }
  };

  const totalSelectedCost = Array.from(selectedBatches)
    .reduce((sum, i) => sum + recommendations[i].estimated_cost, 0);

  const totalSelectedShots = Array.from(selectedBatches)
    .reduce((sum, i) => sum + recommendations[i].shot_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Batch Recommendations</h3>
          <p className="text-sm text-gray-600 mt-1">
            AI-optimized batch groupings for efficient rendering
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={deselectAll}
            className="text-sm text-gray-600 hover:text-gray-700"
          >
            Deselect All
          </button>
        </div>
      </div>

      {!episodeId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-900">Episode Required</h3>
            <p className="text-sm text-yellow-700 mt-1">
              To create batches, you need to convert this to an episode first or select an existing episode.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {recommendations.map((rec, index) => {
          const isSelected = selectedBatches.has(index);
          const isCreated = createdBatches.has(index);

          return (
            <div
              key={index}
              className={`bg-white rounded-lg border-2 transition-all ${
                isCreated
                  ? 'border-green-200 bg-green-50'
                  : isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    {!isCreated && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleBatchSelection(index)}
                        className="mt-1 rounded border-gray-300"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{rec.batch_name}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          rec.render_mode === 'narrative'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {rec.render_mode === 'narrative' ? 'Narrative Mode' : 'Speed Mode'}
                        </span>
                        {isCreated && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Created
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{rec.grouping_logic}</p>
                    </div>
                  </div>

                  {!isCreated && episodeId && (
                    <button
                      onClick={() => handleCreateBatch(rec, index)}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Create Batch
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <Film className="w-4 h-4" />
                      <span className="text-xs">Shots</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">{rec.shot_count}</div>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">Duration</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">{rec.estimated_duration}s</div>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-xs">Cost</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">${rec.estimated_cost.toFixed(2)}</div>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <Package className="w-4 h-4" />
                      <span className="text-xs">Priority</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">#{rec.priority}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedBatches.size > 0 && episodeId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Selected Batches Summary</h4>
              <p className="text-sm text-blue-700">
                {selectedBatches.size} batches • {totalSelectedShots} shots • ${totalSelectedCost.toFixed(2)} estimated cost
              </p>
            </div>
            <button
              onClick={handleCreateSelectedBatches}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Creating...' : `Create ${selectedBatches.size} Batches`}
            </button>
          </div>
        </div>
      )}

      {recommendations.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recommendations</h3>
          <p className="text-gray-600">No batch recommendations available for the selected shots.</p>
        </div>
      )}
    </div>
  );
}
