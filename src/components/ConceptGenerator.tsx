import { useState } from 'react';
import {
  Lightbulb,
  Loader2,
  ChevronRight,
  Check,
  X,
  Megaphone,
  Target,
  Users,
  Zap,
  Music,
  Eye,
  ArrowRight,
  SkipForward,
} from 'lucide-react';
import {
  generateCommercialConcepts,
  generateCommercialSpotScript,
  generateVariantConcept,
  type CampaignBrief,
  type SpotConcept,
  type GeneratedSpotScript,
} from '../services/geminiService';
import { useNotification } from '../contexts/NotificationContext';

interface ConceptGeneratorProps {
  seriesId: string | null;
  onNavigate: (view: string) => void;
}

type Step = 'brief' | 'generating' | 'select' | 'producing' | 'complete';

const OBJECTIVES = [
  { id: 'awareness', label: 'Brand Awareness', icon: '📣' },
  { id: 'consideration', label: 'Drive Consideration', icon: '🤔' },
  { id: 'conversion', label: 'Drive Conversion', icon: '🛒' },
  { id: 'retention', label: 'Customer Retention', icon: '❤️' },
  { id: 'event', label: 'Event / Promo', icon: '🎯' },
];

const TONES = [
  'Authoritative', 'Warm & Friendly', 'Playful / Fun', 'Inspirational',
  'Urgent / Bold', 'Sophisticated', 'Humorous', 'Empathetic',
];

const EMPTY_BRIEF: CampaignBrief = {
  clientName: '',
  agencyName: '',
  productService: '',
  campaignName: '',
  objective: 'awareness',
  targetAudience: '',
  keyMessage: '',
  callToAction: '',
  brandTone: 'Warm & Friendly',
  mandatoryElements: '',
  competitiveRestrictions: '',
  spotLengthSeconds: 30,
  visualStyle: 'photoreal',
  legalDisclaimer: '',
};

export function ConceptGenerator({ seriesId, onNavigate }: ConceptGeneratorProps) {
  const { showError } = useNotification();
  const [step, setStep] = useState<Step>('brief');
  const [brief, setBrief] = useState<CampaignBrief>(EMPTY_BRIEF);
  const [concepts, setConcepts] = useState<SpotConcept[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<SpotConcept | null>(null);
  const [generatingVariants, setGeneratingVariants] = useState(false);
  const [spotScript, setSpotScript] = useState<GeneratedSpotScript | null>(null);
  const [variantScripts, setVariantScripts] = useState<{
    '15'?: GeneratedSpotScript;
    '10'?: GeneratedSpotScript;
  }>({});
  const [statusMessage, setStatusMessage] = useState('');

  const validateBrief = (): string | null => {
    if (!brief.clientName.trim()) return 'Client name is required.';
    if (!brief.productService.trim()) return 'Product / service is required.';
    if (!brief.campaignName.trim()) return 'Campaign name is required.';
    if (!brief.targetAudience.trim()) return 'Target audience is required.';
    if (!brief.keyMessage.trim()) return 'Key message is required.';
    if (!brief.callToAction.trim()) return 'Call to action is required.';
    return null;
  };

  const handleGenerateConcepts = async () => {
    const err = validateBrief();
    if (err) { showError('Missing Information', err); return; }

    setStep('generating');
    setStatusMessage('Analyzing brief and generating creative concepts…');
    try {
      const result = await generateCommercialConcepts(brief);
      setConcepts(result);
      setStep('select');
    } catch (error) {
      showError('Generation Failed', error instanceof Error ? error.message : 'Failed to generate concepts. Please try again.');
      setStep('brief');
    }
  };

  const handleSelectConcept = async (concept: SpotConcept) => {
    setSelectedConcept(concept);
    setStep('producing');
    setStatusMessage(`Producing :${brief.spotLengthSeconds} spot script for "${concept.conceptName}"…`);

    try {
      const script = await generateCommercialSpotScript(brief, concept);
      setSpotScript(script);

      // Auto-generate variants if :30
      if (brief.spotLengthSeconds === 30) {
        setGeneratingVariants(true);
        setStatusMessage('Generating :15 and :10 variant cutdowns…');
        try {
          const [v15concept, v10concept] = await Promise.all([
            generateVariantConcept(concept, 15),
            generateVariantConcept(concept, 10),
          ]);
          const v15brief = { ...brief, spotLengthSeconds: 15 as const };
          const v10brief = { ...brief, spotLengthSeconds: 10 as const };
          const [v15script, v10script] = await Promise.all([
            generateCommercialSpotScript(v15brief, v15concept),
            generateCommercialSpotScript(v10brief, v10concept),
          ]);
          setVariantScripts({ '15': v15script, '10': v10script });
        } catch (variantErr) {
          console.warn('Variant generation failed, continuing without variants:', variantErr);
        } finally {
          setGeneratingVariants(false);
        }
      }

      setStep('complete');
    } catch (error) {
      showError('Production Failed', error instanceof Error ? error.message : 'Script generation failed.');
      setStep('select');
    }
  };

  const handleSkipConcepts = () => {
    // Set a default/empty concept and go straight to brief-based script generation
    const skipConcept: SpotConcept = {
      conceptNumber: 1,
      conceptName: brief.campaignName || 'Direct Brief',
      logline: brief.keyMessage,
      creativeDirection: 'Direct brief execution without concept development phase.',
      emotionalHook: brief.brandTone,
      openingHook: brief.keyMessage,
      keyVisualMoment: brief.productService,
      ctaExecution: brief.callToAction,
      musicMood: 'Match brand tone',
      visualStyle: brief.visualStyle,
    };
    handleSelectConcept(skipConcept);
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['brief', 'select', 'complete'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === s ? 'bg-amber-500 text-white' :
              (['brief', 'select', 'complete'].indexOf(step) > i) ? 'bg-green-500 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {(['brief', 'select', 'complete'].indexOf(step) > i) ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={step === s ? 'font-semibold text-gray-900' : 'text-gray-500'}>
              {s === 'brief' ? 'Campaign Brief' : s === 'select' ? 'Select Concept' : 'Spot Produced'}
            </span>
            {i < 2 && <ChevronRight className="w-4 h-4 text-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step: Brief */}
      {step === 'brief' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Campaign Brief</h2>
            <p className="text-sm text-gray-600">Fill in the brief and we'll generate three creative concepts for you to choose from.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
              <input
                type="text"
                value={brief.clientName}
                onChange={e => setBrief(p => ({ ...p, clientName: e.target.value }))}
                placeholder="e.g. Nike"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product / Service *</label>
              <input
                type="text"
                value={brief.productService}
                onChange={e => setBrief(p => ({ ...p, productService: e.target.value }))}
                placeholder="e.g. Air Max 2026 Sneaker"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
              <input
                type="text"
                value={brief.campaignName}
                onChange={e => setBrief(p => ({ ...p, campaignName: e.target.value }))}
                placeholder="e.g. Just Move Campaign Q2 2026"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Objective */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Objective *</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {OBJECTIVES.map(obj => (
                <button
                  key={obj.id}
                  onClick={() => setBrief(p => ({ ...p, objective: obj.id as any }))}
                  className={`p-2.5 rounded-lg border-2 text-center text-xs font-medium transition-colors ${
                    brief.objective === obj.id
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="text-lg mb-0.5">{obj.icon}</div>
                  {obj.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience *</label>
              <input
                type="text"
                value={brief.targetAudience}
                onChange={e => setBrief(p => ({ ...p, targetAudience: e.target.value }))}
                placeholder="e.g. Athletes 18-35, urban, fitness-focused"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Spot Length *</label>
              <div className="flex gap-2">
                {([10, 15, 30] as const).map(len => (
                  <button
                    key={len}
                    onClick={() => setBrief(p => ({ ...p, spotLengthSeconds: len }))}
                    className={`flex-1 py-2 rounded-lg border-2 text-sm font-bold transition-colors ${
                      brief.spotLengthSeconds === len
                        ? 'border-amber-500 bg-amber-50 text-amber-800'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    :{String(len).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Key Message (single) *</label>
              <input
                type="text"
                value={brief.keyMessage}
                onChange={e => setBrief(p => ({ ...p, keyMessage: e.target.value }))}
                placeholder="e.g. Air Max gives you the edge to push further"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Call to Action *</label>
              <input
                type="text"
                value={brief.callToAction}
                onChange={e => setBrief(p => ({ ...p, callToAction: e.target.value }))}
                placeholder="e.g. Shop Now at nike.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Brand tone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Brand Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(tone => (
                <button
                  key={tone}
                  onClick={() => setBrief(p => ({ ...p, brandTone: tone }))}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    brief.brandTone === tone
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          {/* Visual style */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visual Style</label>
              <select
                value={brief.visualStyle}
                onChange={e => setBrief(p => ({ ...p, visualStyle: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="photoreal">Photo-Real / Cinematic</option>
                <option value="animated">Animated / Motion Graphics</option>
                <option value="mixed">Mixed (Live + Animated)</option>
                <option value="documentary">Documentary / Testimonial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mandatory Elements</label>
              <input
                type="text"
                value={brief.mandatoryElements}
                onChange={e => setBrief(p => ({ ...p, mandatoryElements: e.target.value }))}
                placeholder="e.g. Logo lockup, tagline, product close-up"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Legal Disclaimer (if required)</label>
              <input
                type="text"
                value={brief.legalDisclaimer || ''}
                onChange={e => setBrief(p => ({ ...p, legalDisclaimer: e.target.value }))}
                placeholder="e.g. Results may vary. See site for full terms."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleGenerateConcepts}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
            >
              <Lightbulb className="w-4 h-4" />
              Generate 3 Concepts
            </button>
            <button
              onClick={handleSkipConcepts}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg font-medium text-sm transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              Skip to Production
            </button>
          </div>
        </div>
      )}

      {/* Step: Generating */}
      {(step === 'generating' || step === 'producing') && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
          <p className="text-lg font-semibold text-gray-900 mb-1">{statusMessage}</p>
          <p className="text-sm text-gray-500">This usually takes 10–20 seconds.</p>
        </div>
      )}

      {/* Step: Select Concept */}
      {step === 'select' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Choose a Creative Direction</h2>
              <p className="text-sm text-gray-600 mt-0.5">Select the concept that best matches your vision, or go back to adjust the brief.</p>
            </div>
            <button
              onClick={() => setStep('brief')}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Edit Brief
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {concepts.map(concept => (
              <div
                key={concept.conceptNumber}
                className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-amber-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Concept {concept.conceptNumber}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{concept.conceptName}</h3>
                    <p className="text-sm text-gray-600 mt-0.5 italic">{concept.logline}</p>
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-4">{concept.creativeDirection}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                      <Zap className="w-3.5 h-3.5" /> Opening Hook
                    </div>
                    <p className="text-xs text-gray-700">{concept.openingHook}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                      <Eye className="w-3.5 h-3.5" /> Key Visual
                    </div>
                    <p className="text-xs text-gray-700">{concept.keyVisualMoment}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                      <Target className="w-3.5 h-3.5" /> CTA
                    </div>
                    <p className="text-xs text-gray-700">{concept.ctaExecution}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                      <Music className="w-3.5 h-3.5" /> Music
                    </div>
                    <p className="text-xs text-gray-700">{concept.musicMood}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectConcept(concept)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Use This Concept → Produce Spot
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step: Complete */}
      {step === 'complete' && spotScript && selectedConcept && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-green-900">Spot Produced: "{spotScript.title}"</h2>
                <p className="text-sm text-green-700">:{brief.spotLengthSeconds} spot script ready{brief.spotLengthSeconds === 30 ? ' + :15 and :10 variants' : ''}.</p>
              </div>
            </div>
          </div>

          {/* Hero :30 script */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">:{brief.spotLengthSeconds} Script — {spotScript.title}</h3>
              <span className="text-xs text-gray-500">{spotScript.totalScriptedSeconds}s total</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="divide-y divide-gray-100">
                {spotScript.scenes.map(scene => (
                  <div key={scene.sceneNumber} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-500">SCENE {scene.sceneNumber} — {scene.description.toUpperCase()}</span>
                      <span className="text-xs text-amber-600 font-medium">{scene.durationSeconds}s</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{scene.action}</p>
                    {scene.dialogue && scene.dialogue.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {scene.dialogue.map((d, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="text-xs font-bold text-gray-500 w-8 flex-shrink-0">
                              {d.type === 'vo' ? 'VO' : d.character.substring(0, 4).toUpperCase()}
                            </span>
                            <span className="text-sm italic text-gray-700">"{d.line}"</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {scene.super && (
                      <div className="bg-black text-white text-xs px-2 py-1 rounded font-mono inline-block">
                        SUPER: {scene.super}
                      </div>
                    )}
                    {scene.cameraDirection && (
                      <p className="text-xs text-gray-400 mt-1">{scene.cameraDirection}</p>
                    )}
                  </div>
                ))}
              </div>
              {spotScript.musicDirection && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <span className="text-xs font-bold text-gray-500">MUSIC: </span>
                  <span className="text-sm text-gray-700">{spotScript.musicDirection}</span>
                </div>
              )}
            </div>
          </div>

          {/* Variant scripts */}
          {Object.entries(variantScripts).map(([len, vScript]) => vScript && (
            <div key={len}>
              <h3 className="font-semibold text-gray-900 mb-3">:{len} Variant Cutdown</h3>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {vScript.scenes.map(scene => (
                    <div key={scene.sceneNumber} className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-500">SCENE {scene.sceneNumber}</span>
                        <span className="text-xs text-amber-600 font-medium">{scene.durationSeconds}s</span>
                      </div>
                      <p className="text-sm text-gray-700">{scene.action}</p>
                      {scene.super && (
                        <div className="bg-black text-white text-xs px-2 py-1 rounded font-mono inline-block mt-1">
                          SUPER: {scene.super}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {generatingVariants && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating :15 and :10 variant cutdowns…
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setStep('brief');
                setBrief(EMPTY_BRIEF);
                setConcepts([]);
                setSelectedConcept(null);
                setSpotScript(null);
                setVariantScripts({});
              }}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg font-medium text-sm transition-colors"
            >
              New Campaign
            </button>
            <button
              onClick={() => onNavigate('scripts')}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-colors"
            >
              View All Scripts
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
