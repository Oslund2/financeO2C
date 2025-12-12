import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TRTCalculatorProps {
  episodeId: string;
  shotIds?: string[];
  onTRTUpdate?: (trtData: TRTBreakdown) => void;
}

interface TRTBreakdown {
  opening_sting: number;
  content_duration: number;
  closing_sting: number;
  total_duration: number;
  target_duration: number;
  difference: number;
  shot_count: number;
}

export default function TRTCalculator({ episodeId, shotIds, onTRTUpdate }: TRTCalculatorProps) {
  const [trtData, setTRTData] = useState<TRTBreakdown>({
    opening_sting: 60,
    content_duration: 0,
    closing_sting: 30,
    total_duration: 0,
    target_duration: 1320,
    difference: 0,
    shot_count: 0
  });
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    calculateTRT();
  }, [episodeId, shotIds]);

  const calculateTRT = async () => {
    setLoading(true);
    try {
      const { data: episode, error: episodeError } = await supabase
        .from('episodes')
        .select('trt_metadata, target_runtime_seconds')
        .eq('id', episodeId)
        .maybeSingle();

      if (episodeError) throw episodeError;

      const metadata = episode?.trt_metadata || { opening_sting: 60, content: 1230, closing_sting: 30 };
      const targetDuration = episode?.target_runtime_seconds || 1320;

      let query = supabase
        .from('production_shot_plans')
        .select('duration_seconds, dialogue_content');

      if (shotIds && shotIds.length > 0) {
        query = query.in('id', shotIds);
      } else {
        query = query.eq('episode_id', episodeId);
      }

      const { data: shots, error: shotsError } = await query;

      if (shotsError) throw shotsError;

      let contentDuration = 0;
      if (shots && shots.length > 0) {
        contentDuration = shots.reduce((sum, shot) => {
          let shotDuration = shot.duration_seconds || 5;

          if (shot.dialogue_content && Array.isArray(shot.dialogue_content)) {
            const dialogueDuration = shot.dialogue_content.reduce((dSum: number, line: any) => {
              return dSum + (line.estimated_duration_seconds || 0);
            }, 0);

            shotDuration = Math.max(shotDuration, dialogueDuration);
          }

          return sum + shotDuration;
        }, 0);
      }

      const openingSting = metadata.opening_sting || 60;
      const closingSting = metadata.closing_sting || 30;
      const totalDuration = openingSting + contentDuration + closingSting;
      const difference = totalDuration - targetDuration;

      const newTRTData: TRTBreakdown = {
        opening_sting: openingSting,
        content_duration: contentDuration,
        closing_sting: closingSting,
        total_duration: totalDuration,
        target_duration: targetDuration,
        difference: difference,
        shot_count: shots?.length || 0
      };

      setTRTData(newTRTData);
      onTRTUpdate?.(newTRTData);

      await supabase
        .from('episodes')
        .update({
          actual_runtime_seconds: Math.round(totalDuration),
          trt_metadata: {
            opening_sting: openingSting,
            content: Math.round(contentDuration),
            closing_sting: closingSting
          }
        })
        .eq('id', episodeId);
    } catch (error) {
      console.error('Error calculating TRT:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStingUpdate = async (field: 'opening_sting' | 'closing_sting', value: number) => {
    const updatedData = { ...trtData, [field]: value };
    updatedData.total_duration = updatedData.opening_sting + updatedData.content_duration + updatedData.closing_sting;
    updatedData.difference = updatedData.total_duration - updatedData.target_duration;

    setTRTData(updatedData);

    try {
      await supabase
        .from('episodes')
        .update({
          trt_metadata: {
            opening_sting: updatedData.opening_sting,
            content: updatedData.content_duration,
            closing_sting: updatedData.closing_sting
          }
        })
        .eq('id', episodeId);
    } catch (error) {
      console.error('Error updating sting duration:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (): string => {
    const absDiff = Math.abs(trtData.difference);
    if (absDiff <= 5) return 'text-green-600';
    if (absDiff <= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = () => {
    const absDiff = Math.abs(trtData.difference);
    if (absDiff <= 5) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (absDiff <= 30) return <Info className="w-5 h-5 text-yellow-600" />;
    return <AlertTriangle className="w-5 h-5 text-red-600" />;
  };

  const getStatusMessage = (): string => {
    const diff = trtData.difference;
    const absDiff = Math.abs(diff);

    if (absDiff <= 5) {
      return 'Perfect! TRT is within target range';
    } else if (diff > 0) {
      return `Episode is ${formatTime(diff)} too long`;
    } else {
      return `Episode is ${formatTime(Math.abs(diff))} too short`;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="w-5 h-5 animate-spin" />
          <span>Calculating TRT...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Total Run Time (TRT)</h3>
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {editMode ? 'Done' : 'Edit Stings'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-700 mb-1">Opening Sting</div>
          {editMode ? (
            <input
              type="number"
              value={trtData.opening_sting}
              onChange={(e) => handleStingUpdate('opening_sting', parseInt(e.target.value) || 0)}
              className="w-full text-2xl font-bold text-blue-900 bg-white border border-blue-200 rounded px-2 py-1"
            />
          ) : (
            <div className="text-2xl font-bold text-blue-900">{formatTime(trtData.opening_sting)}</div>
          )}
          <div className="text-xs text-blue-600 mt-1">{trtData.opening_sting}s</div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-700 mb-1">Content</div>
          <div className="text-2xl font-bold text-green-900">{formatTime(trtData.content_duration)}</div>
          <div className="text-xs text-green-600 mt-1">{Math.round(trtData.content_duration)}s • {trtData.shot_count} shots</div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-purple-700 mb-1">Closing Sting</div>
          {editMode ? (
            <input
              type="number"
              value={trtData.closing_sting}
              onChange={(e) => handleStingUpdate('closing_sting', parseInt(e.target.value) || 0)}
              className="w-full text-2xl font-bold text-purple-900 bg-white border border-purple-200 rounded px-2 py-1"
            />
          ) : (
            <div className="text-2xl font-bold text-purple-900">{formatTime(trtData.closing_sting)}</div>
          )}
          <div className="text-xs text-purple-600 mt-1">{trtData.closing_sting}s</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-700 mb-1">Total Duration</div>
          <div className="text-2xl font-bold text-gray-900">{formatTime(trtData.total_duration)}</div>
          <div className="text-xs text-gray-600 mt-1">Target: {formatTime(trtData.target_duration)}</div>
        </div>
      </div>

      <div className={`flex items-center gap-3 p-4 rounded-lg ${
        Math.abs(trtData.difference) <= 5 ? 'bg-green-50' :
        Math.abs(trtData.difference) <= 30 ? 'bg-yellow-50' :
        'bg-red-50'
      }`}>
        {getStatusIcon()}
        <div className="flex-1">
          <div className={`font-semibold ${getStatusColor()}`}>
            {getStatusMessage()}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {Math.abs(trtData.difference) > 5 && (
              <span>
                {trtData.difference > 0
                  ? `Reduce shot durations by ~${Math.round(trtData.difference / trtData.shot_count)}s per shot`
                  : `Add ~${Math.round(Math.abs(trtData.difference) / trtData.shot_count)}s per shot`
                }
              </span>
            )}
          </div>
        </div>
        <div className={`text-2xl font-bold ${getStatusColor()}`}>
          {trtData.difference > 0 ? '+' : ''}{formatTime(trtData.difference)}
        </div>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-600 space-y-1">
          <div><strong>Standard TRT:</strong> 22 minutes (1,320 seconds)</div>
          <div><strong>Breakdown:</strong> 60s opening + 1,230s content + 30s closing</div>
          <div><strong>Acceptable Range:</strong> ±5 seconds from target</div>
        </div>
      </div>
    </div>
  );
}
