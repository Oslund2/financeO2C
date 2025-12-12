import { useState, useEffect, useRef } from 'react';
import { FileText, Film, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ScriptPromptViewerProps {
  scriptId: string;
  shotIds: string[];
  episodeId?: string;
}

interface ScriptContent {
  raw_content: string;
  acts: Array<{
    act_number: number;
    scenes: Array<{
      scene_number: number;
      content: string;
      dialogue: string[];
    }>;
  }>;
}

interface ShotWithPrompt {
  id: string;
  act_number: number;
  scene_number: number;
  shot_number: number;
  shot_type: string;
  duration_seconds: number;
  narrative_description: string;
  dialogue_content: any[];
  prompt_text: string;
  audio_cues: string;
  dialogue_cues: any[];
  status: string;
}

export default function ScriptPromptViewer({ scriptId, shotIds, episodeId }: ScriptPromptViewerProps) {
  const [scriptContent, setScriptContent] = useState<ScriptContent | null>(null);
  const [shots, setShots] = useState<ShotWithPrompt[]>([]);
  const [selectedAct, setSelectedAct] = useState<number>(1);
  const [selectedScene, setSelectedScene] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [panelWidth, setPanelWidth] = useState(50);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const scriptPanelRef = useRef<HTMLDivElement>(null);
  const shotsPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [scriptId, shotIds]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: script, error: scriptError } = await supabase
        .from('scripts')
        .select('content')
        .eq('id', scriptId)
        .maybeSingle();

      if (scriptError) throw scriptError;

      if (script?.content) {
        const parsed = parseScriptContent(script.content);
        setScriptContent(parsed);
      }

      const { data: shotsData, error: shotsError } = await supabase
        .from('production_shot_plans')
        .select(`
          id,
          act_number,
          scene_number,
          shot_number,
          shot_type,
          duration_seconds,
          narrative_description,
          dialogue_content,
          status,
          production_shot_prompts (
            veo3_prompt_text,
            audio_cues,
            dialogue_cues
          )
        `)
        .in('id', shotIds)
        .order('shot_number');

      if (shotsError) throw shotsError;

      const formattedShots = shotsData?.map(shot => {
        const prompt = Array.isArray(shot.production_shot_prompts) && shot.production_shot_prompts.length > 0
          ? shot.production_shot_prompts[0]
          : null;

        return {
          id: shot.id,
          act_number: shot.act_number,
          scene_number: shot.scene_number,
          shot_number: shot.shot_number,
          shot_type: shot.shot_type,
          duration_seconds: shot.duration_seconds,
          narrative_description: shot.narrative_description || '',
          dialogue_content: shot.dialogue_content || [],
          prompt_text: prompt?.veo3_prompt_text || '',
          audio_cues: prompt?.audio_cues || '',
          dialogue_cues: prompt?.dialogue_cues || [],
          status: shot.status
        };
      }) || [];

      setShots(formattedShots);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseScriptContent = (content: string): ScriptContent => {
    const acts: ScriptContent['acts'] = [];
    let currentAct = 1;
    let currentScene = 1;

    const lines = content.split('\n');
    let sceneContent: string[] = [];
    let sceneDialogue: string[] = [];

    lines.forEach(line => {
      if (line.match(/^ACT\s+(\d+)/i)) {
        if (sceneContent.length > 0) {
          addSceneToAct(acts, currentAct, currentScene, sceneContent.join('\n'), sceneDialogue);
          sceneContent = [];
          sceneDialogue = [];
        }
        currentAct = parseInt(line.match(/\d+/)?.[0] || '1');
        currentScene = 1;
      } else if (line.match(/^SCENE\s+(\d+)/i)) {
        if (sceneContent.length > 0) {
          addSceneToAct(acts, currentAct, currentScene, sceneContent.join('\n'), sceneDialogue);
          sceneContent = [];
          sceneDialogue = [];
        }
        currentScene = parseInt(line.match(/\d+/)?.[0] || '1');
      } else {
        sceneContent.push(line);
        if (line.match(/^[A-Z][A-Z\s]+:/)) {
          sceneDialogue.push(line);
        }
      }
    });

    if (sceneContent.length > 0) {
      addSceneToAct(acts, currentAct, currentScene, sceneContent.join('\n'), sceneDialogue);
    }

    return {
      raw_content: content,
      acts
    };
  };

  const addSceneToAct = (
    acts: ScriptContent['acts'],
    actNumber: number,
    sceneNumber: number,
    content: string,
    dialogue: string[]
  ) => {
    let act = acts.find(a => a.act_number === actNumber);
    if (!act) {
      act = { act_number: actNumber, scenes: [] };
      acts.push(act);
    }

    act.scenes.push({
      scene_number: sceneNumber,
      content,
      dialogue
    });
  };

  const getAvailableActs = (): number[] => {
    if (!scriptContent) return [1];
    return scriptContent.acts.map(act => act.act_number);
  };

  const getAvailableScenes = (): number[] => {
    if (!scriptContent) return [1];
    const act = scriptContent.acts.find(a => a.act_number === selectedAct);
    return act?.scenes.map(scene => scene.scene_number) || [1];
  };

  const getCurrentSceneContent = (): string => {
    if (!scriptContent) return '';
    const act = scriptContent.acts.find(a => a.act_number === selectedAct);
    const scene = act?.scenes.find(s => s.scene_number === selectedScene);
    return scene?.content || '';
  };

  const getCurrentShots = (): ShotWithPrompt[] => {
    return shots.filter(shot =>
      shot.act_number === selectedAct && shot.scene_number === selectedScene
    );
  };

  const handleDrag = (e: React.MouseEvent) => {
    const container = e.currentTarget.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    if (newWidth >= 30 && newWidth <= 70) {
      setPanelWidth(newWidth);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <div className="text-center">
          <Film className="w-12 h-12 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading script and prompts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Script & Prompts</h3>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Act:</label>
              <select
                value={selectedAct}
                onChange={(e) => {
                  setSelectedAct(parseInt(e.target.value));
                  setSelectedScene(1);
                }}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                {getAvailableActs().map(act => (
                  <option key={act} value={act}>Act {act}</option>
                ))}
              </select>

              <label className="text-sm text-gray-600 ml-2">Scene:</label>
              <select
                value={selectedScene}
                onChange={(e) => setSelectedScene(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                {getAvailableScenes().map(scene => (
                  <option key={scene} value={scene}>Scene {scene}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-gray-600 hover:text-gray-900"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex h-[600px]">
        <div
          ref={scriptPanelRef}
          style={{ width: `${panelWidth}%` }}
          className="border-r border-gray-200 overflow-y-auto"
        >
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4 text-gray-700">
              <FileText className="w-5 h-5" />
              <h4 className="font-semibold">Source Script</h4>
            </div>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
                {getCurrentSceneContent()}
              </pre>
            </div>
          </div>
        </div>

        <div
          className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize flex items-center justify-center group"
          onMouseDown={(e) => {
            const handleMouseMove = (moveEvent: MouseEvent) => {
              const container = e.currentTarget.parentElement;
              if (!container) return;
              const containerRect = container.getBoundingClientRect();
              const newWidth = ((moveEvent.clientX - containerRect.left) / containerRect.width) * 100;
              if (newWidth >= 30 && newWidth <= 70) {
                setPanelWidth(newWidth);
              }
            };

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        >
          <div className="w-1 h-12 bg-gray-400 rounded-full group-hover:bg-blue-500" />
        </div>

        <div
          ref={shotsPanelRef}
          style={{ width: `${100 - panelWidth}%` }}
          className="overflow-y-auto"
        >
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4 text-gray-700">
              <Film className="w-5 h-5" />
              <h4 className="font-semibold">Veo 3 Prompts</h4>
              <span className="text-sm text-gray-500">({getCurrentShots().length} shots)</span>
            </div>

            <div className="space-y-6">
              {getCurrentShots().map(shot => (
                <div key={shot.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">Shot {shot.shot_number}</span>
                      <span className="text-sm text-gray-500">{shot.shot_type}</span>
                      <span className="text-sm text-gray-500">{shot.duration_seconds}s</span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      shot.status === 'ready' ? 'bg-green-100 text-green-700' :
                      shot.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {shot.status}
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-700 mb-1">Veo 3 Prompt:</div>
                    <div className="text-sm text-gray-800 bg-gray-50 rounded p-3">
                      {shot.prompt_text || 'No prompt generated yet'}
                    </div>
                  </div>

                  {shot.dialogue_cues && shot.dialogue_cues.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Dialogue:</div>
                      <div className="text-sm text-gray-800 bg-blue-50 rounded p-3 space-y-1">
                        {shot.dialogue_cues.map((dialogue: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="font-medium">{dialogue.character_name}:</span>
                            <span>{dialogue.text}</span>
                            <span className="text-xs text-blue-600">
                              [{dialogue.voice_provider}]
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {shot.audio_cues && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Audio Directives:</div>
                      <div className="text-sm text-gray-800 bg-yellow-50 rounded p-3">
                        {shot.audio_cues}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {getCurrentShots().length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Film className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No shots generated for this scene yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
