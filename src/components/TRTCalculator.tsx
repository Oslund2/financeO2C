import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, Info, Pause, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TRTCalculatorProps {
  episodeId?: string;
  scriptId?: string;
  shotIds?: string[];
  onTRTUpdate?: (trtData: TRTBreakdown) => void;
}

interface SegmentTiming {
  segment_number: number;
  name: string;
  start_timecode: string;
  end_timecode: string;
  target_duration: number;
  actual_duration: number;
  shot_count: number;
  break_after: boolean;
  break_duration?: number;
}

interface TRTBreakdown {
  opening_sting: number;
  content_duration: number;
  closing_sting: number;
  total_duration: number;
  target_duration: number;
  difference: number;
  shot_count: number;
  open_time: string;
  close_time: string;
  scripted_content: number;
  break_duration: number;
  segments: SegmentTiming[];
  format_type?: string;
}

interface BreakStructure {
  segment_count: number;
  break_positions: string[];
  break_durations: number[];
  break_types: string[];
  end_break_duration?: number;
}

function getSegmentNames(count: number): string[] {
  if (count === 1) return ['Content'];
  if (count === 2) return ['Part 1', 'Part 2'];
  if (count === 3) return ['Setup', 'Development', 'Resolution'];
  if (count === 4) return ['Setup', 'Rising Action', 'Climax', 'Resolution'];
  if (count === 5) return ['Teaser', 'Setup', 'Rising Action', 'Climax', 'Resolution'];
  return Array.from({ length: count }, (_, i) => `Segment ${i + 1}`);
}

function calculateSegmentTargets(contentSeconds: number, segmentCount: number): number[] {
  if (segmentCount === 1) return [contentSeconds];

  const baseSegmentTime = Math.floor(contentSeconds / segmentCount);
  const remainder = contentSeconds - (baseSegmentTime * segmentCount);

  return Array.from({ length: segmentCount }, (_, i) =>
    i === segmentCount - 1 ? baseSegmentTime + remainder : baseSegmentTime
  );
}

export default function TRTCalculator({ episodeId, scriptId, shotIds, onTRTUpdate }: TRTCalculatorProps) {
  const [trtData, setTRTData] = useState<TRTBreakdown>({
    opening_sting: 60,
    content_duration: 0,
    closing_sting: 30,
    total_duration: 0,
    target_duration: 300,
    difference: 0,
    shot_count: 0,
    open_time: '00:01:00',
    close_time: '00:05:00',
    scripted_content: 0,
    break_duration: 0,
    segments: [{
      segment_number: 1,
      name: 'Content',
      start_timecode: '00:00:00',
      end_timecode: '00:00:00',
      target_duration: 300,
      actual_duration: 0,
      shot_count: 0,
      break_after: false
    }],
    format_type: 'short_form'
  });
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showSegments, setShowSegments] = useState(true);

  useEffect(() => {
    if (episodeId || scriptId) {
      calculateTRT();
    }
  }, [episodeId, scriptId, shotIds]);

  const calculateTRT = async () => {
    setLoading(true);
    try {
      let metadata: any = {};
      let targetDuration = 300;
      let formatType = 'short_form';
      let effectiveScriptId = scriptId;
      let needsEpisodeUpdate = false;

      if (episodeId) {
        const { data: episode, error: episodeError } = await supabase
          .from('episodes')
          .select('trt_metadata, target_runtime_seconds, script_id')
          .eq('id', episodeId)
          .maybeSingle();

        if (episodeError) throw episodeError;

        metadata = episode?.trt_metadata || {};
        targetDuration = episode?.target_runtime_seconds || 300;
        formatType = metadata.format_type || 'short_form';
        effectiveScriptId = effectiveScriptId || episode?.script_id;

        if (effectiveScriptId) {
          const { data: script, error: scriptError } = await supabase
            .from('scripts')
            .select('program_length_minutes, break_structure, format_type')
            .eq('id', effectiveScriptId)
            .maybeSingle();

          if (!scriptError && script) {
            const scriptTargetSeconds = (script.program_length_minutes || 5) * 60;

            if (targetDuration !== scriptTargetSeconds) {
              targetDuration = scriptTargetSeconds;
              formatType = script.format_type || 'short_form';

              const openingSting = metadata.opening_sting || 60;
              const closingSting = metadata.closing_sting || 30;

              metadata = {
                ...metadata,
                opening_sting: openingSting,
                closing_sting: closingSting,
                content: targetDuration - openingSting - closingSting,
                format_type: formatType,
                break_structure: script.break_structure || metadata.break_structure || {
                  segment_count: 1,
                  break_positions: [],
                  break_durations: [],
                  break_types: []
                }
              };
              needsEpisodeUpdate = true;
            }
          }
        }
      } else if (scriptId) {
        const { data: script, error: scriptError } = await supabase
          .from('scripts')
          .select('program_length_minutes, total_episode_minutes, break_structure, format_type')
          .eq('id', scriptId)
          .maybeSingle();

        if (scriptError) throw scriptError;

        if (script) {
          targetDuration = (script.program_length_minutes || 5) * 60;
          formatType = script.format_type || 'short_form';
          metadata = {
            opening_sting: 60,
            closing_sting: 30,
            format_type: formatType,
            break_structure: script.break_structure || {
              segment_count: 1,
              break_positions: [],
              break_durations: [],
              break_types: []
            }
          };
        }
      }

      const breakStructure: BreakStructure = metadata.break_structure || {
        segment_count: 1,
        break_positions: [],
        break_durations: [],
        break_types: []
      };

      const segmentCount = breakStructure.segment_count || 1;
      const breakDurations = breakStructure.break_durations || [];
      const totalBreakDuration = breakDurations.reduce((sum: number, d: number) => sum + d, 0);

      const openingSting = metadata.opening_sting || 60;
      const closingSting = metadata.closing_sting || 30;
      const scriptedContentTarget = targetDuration - openingSting - closingSting;

      const segmentNames = getSegmentNames(segmentCount);
      const segmentTargets = calculateSegmentTargets(scriptedContentTarget, segmentCount);

      let query = supabase
        .from('production_shot_plans')
        .select('duration_seconds, dialogue_content, act_number');

      if (shotIds && shotIds.length > 0) {
        query = query.in('id', shotIds);
      } else if (episodeId) {
        query = query.eq('episode_id', episodeId);
      } else {
        query = query.is('episode_id', null);
      }

      const { data: shots, error: shotsError } = await query.order('rendering_order');

      if (shotsError) throw shotsError;

      let contentDuration = 0;
      const segmentDurations = Array(segmentCount).fill(0);
      const segmentShotCounts = Array(segmentCount).fill(0);

      if (shots && shots.length > 0) {
        const shotsPerSegment = Math.ceil(shots.length / segmentCount);

        shots.forEach((shot, index) => {
          let shotDuration = shot.duration_seconds || 5;

          if (shot.dialogue_content && Array.isArray(shot.dialogue_content)) {
            const dialogueDuration = shot.dialogue_content.reduce((dSum: number, line: any) => {
              return dSum + (line.estimated_duration_seconds || 0);
            }, 0);
            shotDuration = Math.max(shotDuration, dialogueDuration);
          }

          contentDuration += shotDuration;

          const segmentIndex = Math.min(Math.floor(index / shotsPerSegment), segmentCount - 1);
          segmentDurations[segmentIndex] += shotDuration;
          segmentShotCounts[segmentIndex]++;
        });
      }

      const totalContentHole = contentDuration + totalBreakDuration;
      const totalDuration = openingSting + totalContentHole + closingSting;
      const difference = totalDuration - targetDuration;

      let runningTimecode = openingSting;
      const segments: SegmentTiming[] = segmentNames.map((name, i) => {
        const startTimecode = formatTimecodeFromSeconds(runningTimecode);
        const segmentDuration = segmentDurations[i];
        runningTimecode += segmentDuration;
        const endTimecode = formatTimecodeFromSeconds(runningTimecode);

        const hasBreakAfter = i < breakDurations.length;
        const breakAfterDuration = hasBreakAfter ? breakDurations[i] : 0;

        if (hasBreakAfter) {
          runningTimecode += breakAfterDuration;
        }

        return {
          segment_number: i + 1,
          name,
          start_timecode: startTimecode,
          end_timecode: endTimecode,
          target_duration: segmentTargets[i],
          actual_duration: segmentDuration,
          shot_count: segmentShotCounts[i],
          break_after: hasBreakAfter && breakAfterDuration > 0,
          break_duration: breakAfterDuration
        };
      });

      const newTRTData: TRTBreakdown = {
        opening_sting: openingSting,
        content_duration: totalContentHole,
        closing_sting: closingSting,
        total_duration: totalDuration,
        target_duration: targetDuration,
        difference: difference,
        shot_count: shots?.length || 0,
        open_time: formatTimecodeFromSeconds(openingSting),
        close_time: formatTimecodeFromSeconds(openingSting + totalContentHole),
        scripted_content: contentDuration,
        break_duration: totalBreakDuration,
        segments,
        format_type: formatType
      };

      setTRTData(newTRTData);
      onTRTUpdate?.(newTRTData);

      if (episodeId) {
        const updatePayload: any = {
          actual_runtime_seconds: Math.round(totalDuration),
          trt_metadata: {
            ...metadata,
            opening_sting: openingSting,
            content: Math.round(totalContentHole),
            closing_sting: closingSting,
            scripted_content: Math.round(contentDuration),
            break_duration: totalBreakDuration,
            format_type: formatType
          }
        };

        if (needsEpisodeUpdate) {
          updatePayload.target_runtime_seconds = targetDuration;
        }

        await supabase
          .from('episodes')
          .update(updatePayload)
          .eq('id', episodeId);
      }
    } catch (error) {
      console.error('Error calculating TRT:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimecodeFromSeconds = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

      <div className="mt-6 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Play className="w-4 h-4" />
            Content Segments with Commercial Breaks
          </h4>
          <button
            onClick={() => setShowSegments(!showSegments)}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            {showSegments ? 'Hide Segments' : 'Show Segments'}
          </button>
        </div>

        {showSegments && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
              <span className="font-medium">OPEN:</span>
              <span className="font-mono bg-green-100 text-green-700 px-2 py-0.5 rounded">{trtData.open_time}</span>
              <span className="mx-2">to</span>
              <span className="font-medium">CLOSE:</span>
              <span className="font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded">{trtData.close_time}</span>
            </div>

            {trtData.segments.map((segment, index) => {
              const diff = segment.actual_duration - segment.target_duration;
              const isOnTarget = Math.abs(diff) <= 15;
              const isShort = diff < -15;

              return (
                <div key={segment.segment_number}>
                  <div className={`p-3 rounded-lg border ${
                    isOnTarget ? 'bg-green-50 border-green-200' :
                    isShort ? 'bg-amber-50 border-amber-200' :
                    'bg-orange-50 border-orange-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-500">SEG {segment.segment_number}</span>
                        <span className="text-sm font-medium text-gray-800">{segment.name}</span>
                        <span className="text-xs text-gray-500 font-mono">
                          {segment.start_timecode} - {segment.end_timecode}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">
                            {formatTime(segment.actual_duration)}
                          </div>
                          <div className="text-xs text-gray-500">
                            target: {formatTime(segment.target_duration)}
                          </div>
                        </div>
                        <div className={`text-xs font-medium px-2 py-1 rounded ${
                          isOnTarget ? 'bg-green-100 text-green-700' :
                          isShort ? 'bg-amber-100 text-amber-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {diff > 0 ? '+' : ''}{formatTime(diff)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {segment.shot_count} shots
                        </div>
                      </div>
                    </div>
                  </div>

                  {segment.break_after && segment.break_duration && segment.break_duration > 0 && (
                    <div className="flex items-center justify-center py-2">
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 rounded-full">
                        <Pause className="w-3 h-3 text-gray-500" />
                        <span className="text-xs font-medium text-gray-600">
                          BREAK {index + 1} - {formatTime(segment.break_duration)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-600 space-y-1">
          <div><strong>Target TRT:</strong> {formatTime(trtData.target_duration)} ({trtData.target_duration} seconds) - {getFormatLabel(trtData.format_type)}</div>
          <div><strong>Content:</strong> {formatTime(trtData.scripted_content)} scripted{trtData.break_duration > 0 ? ` + ${formatTime(trtData.break_duration)} breaks` : ''}</div>
          <div><strong>Breakdown:</strong> {trtData.opening_sting}s opening + {formatTime(trtData.scripted_content)} content{trtData.break_duration > 0 ? ` + ${formatTime(trtData.break_duration)} breaks` : ''} + {trtData.closing_sting}s closing</div>
          <div><strong>Target Scripted Content:</strong> {formatTime(trtData.target_duration - trtData.opening_sting - trtData.closing_sting)} ({trtData.target_duration - trtData.opening_sting - trtData.closing_sting} seconds)</div>
          <div><strong>Acceptable Range:</strong> ±5 seconds from total target</div>
        </div>
      </div>
    </div>
  );
}

function getFormatLabel(formatType?: string): string {
  switch (formatType) {
    case 'broadcast': return 'Broadcast';
    case 'streaming': return 'Streaming';
    case 'short_form': return 'Short Form';
    case 'medium_form': return 'Medium Form';
    case 'custom': return 'Custom';
    default: return formatType || 'Unknown';
  }
}
