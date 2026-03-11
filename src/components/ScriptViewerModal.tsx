import { useState, useEffect } from 'react';
import { X, FileText, Clock, Sparkles, Calendar, Tag, Globe, Printer, ChevronDown, ChevronUp, Info, BookOpen, CheckCircle, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { ScriptTranslationManager } from './ScriptTranslationManager';
import CitationManager from './CitationManager';
import AccuracyCheckPanel from './AccuracyCheckPanel';
import SyntheticAudiencePanel from './SyntheticAudiencePanel';
import ScriptCompareModal from './ScriptCompareModal';
import { useWorkspaceCapabilities } from '../hooks/useWorkspaceCapabilities';
import { citationService } from '../services/citationService';
import { accuracyCheckService } from '../services/accuracyCheckService';
import type { FocusGroup } from '../services/syntheticAudienceService';

type Script = Database['public']['Tables']['scripts']['Row'];

interface ScriptViewerModalProps {
  script: Script;
  onClose: () => void;
  onEdit?: () => void;
}

interface Act {
  id: string;
  act_number: number;
  content: string;
  notes: string;
  duration_estimate: number;
  scenes: Scene[];
}

interface Scene {
  id: string;
  scene_number: number;
  setting: string;
  description: string;
  dialogue: any;
  stage_directions: string;
  duration_estimate: number;
  characters: string[];
}

export function ScriptViewerModal({ script, onClose, onEdit }: ScriptViewerModalProps) {
  const [acts, setActs] = useState<Act[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAct, setActiveAct] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'script' | 'translations' | 'citations' | 'accuracy' | 'audience'>('script');
  const [compareGroup, setCompareGroup] = useState<FocusGroup | null>(null);
  const [metadataExpanded, setMetadataExpanded] = useState(false);
  const [citationCount, setCitationCount] = useState(0);
  const [accuracyStatus, setAccuracyStatus] = useState<string>('not_checked');

  const { isFeatureEnabled, isPhotoreal } = useWorkspaceCapabilities();
  const showCitations = isFeatureEnabled('citation_manager');
  const showAccuracyCheck = isFeatureEnabled('historical_fact_checker');
  const showAudience = isFeatureEnabled('synthetic_audience_testing');

  useEffect(() => {
    loadScriptContent();
  }, [script.id]);

  useEffect(() => {
    if (showCitations) {
      citationService.getCitationCount(script.id).then(setCitationCount).catch(console.error);
    }
    if (showAccuracyCheck) {
      accuracyCheckService.getAccuracySummary(script.id).then(summary => {
        setAccuracyStatus(summary.status);
      }).catch(console.error);
    }
  }, [script.id, showCitations, showAccuracyCheck]);

  const loadScriptContent = async () => {
    try {
      const { data: actsData, error: actsError } = await supabase
        .from('script_acts')
        .select('*')
        .eq('script_id', script.id)
        .order('act_number', { ascending: true });

      if (actsError) throw actsError;

      const actsWithScenes = await Promise.all(
        (actsData || []).map(async (act) => {
          const { data: scenesData, error: scenesError } = await supabase
            .from('script_scenes')
            .select('*')
            .eq('act_id', act.id)
            .order('scene_number', { ascending: true });

          if (scenesError) throw scenesError;

          return {
            ...act,
            scenes: scenesData || []
          };
        })
      );

      setActs(actsWithScenes);
    } catch (error) {
      console.error('Error loading script content:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const totalScenes = acts.reduce((sum, act) => sum + act.scenes.length, 0);
  const totalDuration = acts.reduce((sum, act) => sum + (act.duration_estimate || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          .script-modal-container {
            display: none !important;
          }

          #script-print-area {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0.25in;
          }

          .print-title-page {
            page-break-after: always;
            text-align: center;
            padding-top: 3in;
          }

          .print-act {
            page-break-before: always;
          }

          .print-scene {
            page-break-inside: avoid;
            margin-bottom: 2em;
          }

          .print-scene-heading {
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 1em;
            margin-top: 1.5em;
          }

          .print-dialogue-block {
            margin-bottom: 1em;
          }

          .print-character-name {
            text-align: center;
            font-weight: bold;
            margin-bottom: 0.25em;
            text-transform: uppercase;
          }

          .print-dialogue {
            margin-left: 1.5in;
            margin-right: 1in;
            margin-bottom: 0.5em;
          }

          .print-stage-direction {
            font-style: italic;
            margin-left: 1.25in;
            margin-right: 1.25in;
            margin-bottom: 0.5em;
          }

          .print-scene-description {
            margin-left: 1in;
            margin-right: 1in;
            margin-bottom: 1em;
            font-style: italic;
          }

          @page {
            size: letter;
            margin: 0.75in;
          }
        }
      `}</style>
      <div
        className="script-modal-container fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="bg-gradient-to-r from-scripps-blue to-scripps-light-blue p-6 text-white flex-shrink-0 print:hidden">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">{script.title}</h2>
                  {script.episode_number && (
                    <p className="text-blue-100 text-sm">
                      Season {script.season_number} • Episode {script.episode_number}
                    </p>
                  )}
                </div>
              </div>
              {script.ai_generated && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Generated</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMetadataExpanded(!metadataExpanded)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors flex items-center gap-2"
                title={metadataExpanded ? "Hide script info" : "Show script info"}
              >
                <Info className="w-5 h-5" />
                {metadataExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {metadataExpanded && (
          <div className="bg-gray-50 border-b border-gray-200 print:hidden overflow-hidden transition-all duration-300">
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-gray-600">Runtime</p>
                    <p className="font-semibold text-gray-900">{script.runtime_minutes} min</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-gray-600">Acts</p>
                    <p className="font-semibold text-gray-900">{acts.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-gray-600">Scenes</p>
                    <p className="font-semibold text-gray-900">{totalScenes}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-gray-600">Created</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(script.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {script.synopsis && (
                <div className="pt-3 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Synopsis</h3>
                  <p className="text-gray-700 text-sm">{script.synopsis}</p>
                </div>
              )}

              {script.theme && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-700">Theme:</span>
                    <span className="text-sm text-gray-700">{script.theme}</span>
                  </div>
                </div>
              )}

              {script.vocabulary_words.length > 0 && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-semibold text-gray-700">Vocabulary:</span>
                    <div className="flex flex-wrap gap-2">
                      {script.vocabulary_words.map((word, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12 print:hidden">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-scripps-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading script content...</p>
            </div>
          </div>
        ) : acts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-12 print:hidden">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">This script has no acts or scenes yet.</p>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="mt-4 px-4 py-2 bg-scripps-blue text-white rounded-lg hover:bg-opacity-90 transition-colors text-sm font-medium"
                >
                  Edit Script
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-gray-200 flex-shrink-0 print:hidden">
              <div className="flex items-center gap-2 px-6 pt-3">
                <button
                  onClick={() => setViewMode('script')}
                  className={`flex items-center gap-2 px-4 py-2 font-medium transition-all rounded-t-lg ${
                    viewMode === 'script'
                      ? 'text-scripps-blue bg-blue-50 border-t-2 border-x-2 border-scripps-blue'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Script Content
                </button>
                <button
                  onClick={() => setViewMode('translations')}
                  className={`flex items-center gap-2 px-4 py-2 font-medium transition-all rounded-t-lg ${
                    viewMode === 'translations'
                      ? 'text-scripps-blue bg-blue-50 border-t-2 border-x-2 border-scripps-blue'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Translations
                </button>
                {showCitations && (
                  <button
                    onClick={() => setViewMode('citations')}
                    className={`flex items-center gap-2 px-4 py-2 font-medium transition-all rounded-t-lg ${
                      viewMode === 'citations'
                        ? 'text-scripps-blue bg-blue-50 border-t-2 border-x-2 border-scripps-blue'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Citations
                    {citationCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {citationCount}
                      </span>
                    )}
                  </button>
                )}
                {showAccuracyCheck && (
                  <button
                    onClick={() => setViewMode('accuracy')}
                    className={`flex items-center gap-2 px-4 py-2 font-medium transition-all rounded-t-lg ${
                      viewMode === 'accuracy'
                        ? 'text-scripps-blue bg-blue-50 border-t-2 border-x-2 border-scripps-blue'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Accuracy
                    {accuracyStatus !== 'not_checked' && (
                      <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                        accuracyStatus === 'verified' ? 'bg-green-100 text-green-700' :
                        accuracyStatus === 'needs_review' ? 'bg-red-100 text-red-700' :
                        accuracyStatus === 'needs_citations' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {accuracyStatus === 'verified' ? 'Verified' :
                         accuracyStatus === 'needs_review' ? 'Needs Review' :
                         accuracyStatus === 'needs_citations' ? 'Needs Citations' :
                         'Checked'}
                      </span>
                    )}
                  </button>
                )}
                {showAudience && (
                  <button
                    onClick={() => setViewMode('audience')}
                    className={`flex items-center gap-2 px-4 py-2 font-medium transition-all rounded-t-lg ${
                      viewMode === 'audience'
                        ? 'text-scripps-blue bg-blue-50 border-t-2 border-x-2 border-scripps-blue'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Audience
                  </button>
                )}
              </div>

              {viewMode === 'script' && (
                <div className="flex overflow-x-auto">
                  {acts.map((act, index) => (
                    <button
                      key={act.id}
                      onClick={() => setActiveAct(index)}
                      className={`flex-1 px-6 py-3 font-medium transition-all whitespace-nowrap ${
                        activeAct === index
                          ? 'text-scripps-blue border-b-2 border-scripps-blue bg-blue-50'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Act {act.act_number}
                      {act.notes && ` • ${act.notes}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 print:hidden">
              {viewMode === 'script' ? (
                acts[activeAct] && (
                  <div className="space-y-6">
                    {acts[activeAct].content && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-2">Act Overview</h3>
                        <p className="text-gray-700 whitespace-pre-wrap">{acts[activeAct].content}</p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        Scenes ({acts[activeAct].scenes.length})
                      </h3>
                      {acts[activeAct].scenes.map((scene) => (
                        <div
                          key={scene.id}
                          className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-semibold text-gray-900 text-lg">
                              Scene {scene.scene_number}
                            </h4>
                            {scene.duration_estimate > 0 && (
                              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                {formatDuration(scene.duration_estimate)}
                              </span>
                            )}
                          </div>

                          {scene.setting && (
                            <div className="mb-3">
                              <span className="text-sm font-semibold text-gray-700">Setting:</span>
                              <span className="text-sm text-gray-600 ml-2">{scene.setting}</span>
                            </div>
                          )}

                          {scene.description && (
                            <div className="mb-4">
                              <p className="text-gray-700 italic">{scene.description}</p>
                            </div>
                          )}

                          {scene.dialogue && Array.isArray(scene.dialogue) && scene.dialogue.length > 0 && (
                            <div className="space-y-3 mb-4">
                              {scene.dialogue.map((line: any, lineIndex: number) => (
                                <div key={lineIndex} className="pl-4 border-l-2 border-blue-200">
                                  <div className="font-semibold text-gray-900 mb-1">
                                    {line.character}
                                  </div>
                                  <div className="text-gray-700">{line.line}</div>
                                  {line.stage_direction && (
                                    <div className="text-sm text-gray-500 italic mt-1">
                                      ({line.stage_direction})
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {scene.stage_directions && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <p className="text-sm text-gray-600">
                                <span className="font-semibold">Production Notes:</span>{' '}
                                {scene.stage_directions}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : viewMode === 'translations' ? (
                <ScriptTranslationManager
                  scriptId={script.id}
                  scriptTitle={script.title}
                />
              ) : viewMode === 'citations' ? (
                <CitationManager
                  scriptId={script.id}
                  organizationId={script.organization_id || undefined}
                  onCitationCountChange={setCitationCount}
                />
              ) : viewMode === 'accuracy' ? (
                <AccuracyCheckPanel
                  scriptId={script.id}
                  organizationId={script.organization_id || undefined}
                  scriptContent={acts.length > 0 ? { title: script.title, acts } : undefined}
                  historicalPeriod={script.theme || 'General history'}
                  onRegenerateRequest={() => {
                    console.log('Script regeneration requested');
                  }}
                />
              ) : viewMode === 'audience' ? (
                <SyntheticAudiencePanel
                  scriptId={script.id}
                  organizationId={script.organization_id || undefined}
                  scriptContent={acts.length > 0 ? { title: script.title, acts } : undefined}
                  seriesId={script.series_id || undefined}
                  onCompareRequest={(fg) => setCompareGroup(fg)}
                />
              ) : null}
            </div>
          </>
        )}

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center gap-3 flex-shrink-0 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium"
            title="Print script in Table Read format"
          >
            <Printer className="w-5 h-5" />
            Print Script
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
            >
              Close
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-6 py-2 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium"
              >
                Edit Script
              </button>
            )}
          </div>
        </div>
      </div>
      </div>

      {compareGroup && (
        <ScriptCompareModal
          focusGroup={compareGroup}
          organizationId={script.organization_id || ''}
          primaryScriptTitle={script.title}
          onClose={() => setCompareGroup(null)}
          onComplete={() => setCompareGroup(null)}
        />
      )}

      {/* Hidden print-only area with Table Read format */}
      <div id="script-print-area" style={{ display: 'none' }} className="print:block">
        {/* Title Page */}
        <div className="print-title-page">
          <h1 style={{ fontSize: '24pt', marginBottom: '2em' }}>{script.title}</h1>
          {script.episode_number && (
            <p style={{ fontSize: '14pt', marginBottom: '1em' }}>
              Season {script.season_number}, Episode {script.episode_number}
            </p>
          )}
          {script.synopsis && (
            <div style={{ marginTop: '3em', textAlign: 'left', marginLeft: '1.5in', marginRight: '1.5in' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '0.5em' }}>SYNOPSIS:</p>
              <p>{script.synopsis}</p>
            </div>
          )}
          <div style={{ marginTop: '3em' }}>
            <p style={{ fontSize: '12pt' }}>Written by: AI-Assisted</p>
            <p style={{ fontSize: '12pt' }}>Runtime: {script.runtime_minutes} minutes</p>
            {script.created_at && (
              <p style={{ fontSize: '10pt', marginTop: '1em' }}>
                {new Date(script.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Cast List */}
        {acts.length > 0 && (
          <div style={{ pageBreakAfter: 'always', marginTop: '2em' }}>
            <h2 style={{ fontSize: '16pt', fontWeight: 'bold', marginBottom: '1em', textAlign: 'center' }}>
              CAST
            </h2>
            <div style={{ marginLeft: '2in' }}>
              {Array.from(new Set(
                acts.flatMap(act =>
                  act.scenes.flatMap((scene: Scene) =>
                    Array.isArray(scene.dialogue)
                      ? scene.dialogue.map((d: any) => d.character)
                      : []
                  )
                )
              )).sort().map((character, idx) => (
                <p key={idx} style={{ marginBottom: '0.5em' }}>{character}</p>
              ))}
            </div>
          </div>
        )}

        {/* Script Content */}
        <div>
          <p style={{ fontWeight: 'bold', marginBottom: '2em' }}>FADE IN:</p>

          {acts.map((act, actIndex) => (
            <div key={act.id} className={actIndex > 0 ? 'print-act' : ''}>
              <h2 style={{
                fontSize: '14pt',
                fontWeight: 'bold',
                textAlign: 'center',
                marginTop: '2em',
                marginBottom: '2em',
                textDecoration: 'underline'
              }}>
                {act.notes || `ACT ${act.act_number}`}
              </h2>

              {act.scenes.map((scene: Scene) => (
                <div key={scene.id} className="print-scene">
                  {/* Scene Heading */}
                  <div className="print-scene-heading">
                    {scene.setting || `SCENE ${scene.scene_number}`}
                  </div>

                  {/* Scene Description */}
                  {scene.description && (
                    <div className="print-scene-description">
                      {scene.description}
                    </div>
                  )}

                  {/* Dialogue */}
                  {Array.isArray(scene.dialogue) && scene.dialogue.map((line: any, lineIndex: number) => (
                    <div key={lineIndex} className="print-dialogue-block">
                      <div className="print-character-name">
                        {line.character}
                      </div>
                      {line.stage_direction && (
                        <div className="print-stage-direction">
                          ({line.stage_direction})
                        </div>
                      )}
                      <div className="print-dialogue">
                        {line.line}
                      </div>
                    </div>
                  ))}

                  {/* Production Notes */}
                  {scene.stage_directions && (
                    <div className="print-stage-direction" style={{ marginTop: '1em' }}>
                      [{scene.stage_directions}]
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          <p style={{ fontWeight: 'bold', marginTop: '3em', textAlign: 'center' }}>
            FADE OUT.
          </p>
          <p style={{ textAlign: 'center', marginTop: '2em', fontSize: '10pt' }}>
            THE END
          </p>
        </div>
      </div>
    </>
  );
}
