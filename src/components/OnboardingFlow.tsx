import { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Users,
  FileText,
  Film,
  Sparkles,
  Check,
  Keyboard,
  Command,
  Camera,
  Video,
  Wand2,
  BookOpen,
  TrendingUp,
  Megaphone,
  Lightbulb,
  DollarSign,
  Zap,
} from 'lucide-react';
import { useWorkspaceCapabilities } from '../hooks/useWorkspaceCapabilities';

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Users;
  iconBg: string;
  features: { icon: typeof Check; text: string }[];
  tip?: string;
}

const COMMERCIAL_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Commercial & Promo',
    description:
      'Your AI-powered production studio for commercial spots, promos, and branded content. Go from brief to deliverables in hours, not weeks.',
    icon: Megaphone,
    iconBg: 'from-amber-500 to-orange-500',
    features: [
      { icon: Check, text: 'Photo-real, animated, and mixed-media spot production' },
      { icon: Check, text: ':10, :15, and :30 spots with auto-generated variant cutdowns' },
      { icon: Check, text: 'AI concept generation — 3 creative directions from one brief' },
      { icon: Check, text: '90%+ margins vs. traditional agency production' },
    ],
  },
  {
    id: 'brief',
    title: 'Start with a Campaign Brief',
    description:
      'Enter your client, product, objective, audience, key message, and CTA. The AI uses this brief to generate three distinct creative concepts for you to choose from — or skip straight to production if you already have a direction.',
    icon: FileText,
    iconBg: 'from-blue-500 to-cyan-500',
    features: [
      { icon: Check, text: 'Client, product, objective, audience, and CTA in one form' },
      { icon: Check, text: 'Choose spot length: :10 bumper, :15 pre-roll, or :30 spot' },
      { icon: Check, text: 'Brand tone, visual style, and mandatory elements built in' },
      { icon: Check, text: 'Skip concept gate and go direct to production any time' },
    ],
    tip: 'The more specific your brief, the sharper your concepts. One key message — not three.',
  },
  {
    id: 'concepts',
    title: 'Choose a Creative Direction',
    description:
      'AI generates three distinct creative concepts — each with a logline, opening hook, key visual moment, CTA execution, and music direction. Select the one that fits, or skip if you already know your direction.',
    icon: Lightbulb,
    iconBg: 'from-yellow-500 to-amber-500',
    features: [
      { icon: Check, text: 'Three genuinely different creative approaches — not variations' },
      { icon: Check, text: 'Each concept includes opening hook, key visual, and CTA' },
      { icon: Check, text: 'Select a concept → full spot script generated immediately' },
      { icon: Check, text: 'Skippable — come with a direction already? Go straight to script' },
    ],
    tip: 'Share the three concept cards with your client before entering production — saves revision rounds.',
  },
  {
    id: 'talent',
    title: 'Characters & Talent',
    description:
      'Characters are named recurring figures (brand mascots, spokespeople with identity). Talent profiles are unnamed types — "confident professional woman, 30s" — that drive image and video generation without locking you into a named cast.',
    icon: Users,
    iconBg: 'from-green-500 to-emerald-500',
    features: [
      { icon: Check, text: 'Named characters for recurring brand figures and mascots' },
      { icon: Check, text: 'Talent profiles for typed/unnamed on-screen talent' },
      { icon: Check, text: 'Physical descriptions drive photo-real image and video generation' },
      { icon: Check, text: 'Both types integrate into concept scripts and storyboards' },
    ],
  },
  {
    id: 'variants',
    title: 'Auto-Generate Variant Cutdowns',
    description:
      'Approve a :30 spot and the system automatically generates :15 and :10 cutdowns — preserving your key message and CTA, trimming the setup. Traditional agencies charge 40–60% of original cost per variant. You pay a fraction.',
    icon: Zap,
    iconBg: 'from-purple-500 to-indigo-500',
    features: [
      { icon: Check, text: ':30 approval triggers automatic :15 and :10 generation' },
      { icon: Check, text: 'AI intelligently trims narrative, preserves core + CTA' },
      { icon: Check, text: 'All three variants ready for broadcast, digital, and social' },
      { icon: Check, text: '~90% cheaper than traditional variant production' },
    ],
    tip: 'One :30 concept → three deliverables (:30, :15, :10) for roughly 1.2× the cost of one.',
  },
  {
    id: 'economics',
    title: 'Project Economics & AI Advantage',
    description:
      'Track production costs, client billing, and gross margin per project. The AI Advantage panel shows exactly how much cheaper and faster your production is vs. a traditional agency — a ready-made client pitch.',
    icon: DollarSign,
    iconBg: 'from-teal-500 to-cyan-600',
    features: [
      { icon: Check, text: 'Project fee model: revenue minus AI + labor costs = margin' },
      { icon: Check, text: 'Target ≥80% gross margin — platform designed for 90%+' },
      { icon: Check, text: 'AI Advantage calculator: side-by-side vs. traditional agency' },
      { icon: Check, text: 'Client pitch talking point built into the economics screen' },
    ],
  },
  {
    id: 'shortcuts',
    title: 'Pro Tips',
    description: 'Use keyboard shortcuts to move faster between campaigns, spots, and production.',
    icon: Keyboard,
    iconBg: 'from-gray-600 to-gray-800',
    features: [
      { icon: Command, text: 'Press Cmd/Ctrl + K to open the Command Palette' },
      { icon: Check, text: 'Quick navigation between campaigns and spots' },
      { icon: Check, text: 'Search across all briefs, scripts, and storyboards' },
      { icon: Check, text: 'Keyboard-first workflow for power producers' },
    ],
    tip: 'The Command Palette is your fastest way to jump between active campaigns.',
  },
];

const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Scripps AI Studio',
    description:
      'Your end-to-end video production platform powered by AI — from photo-real cinematic scenes to animation. Create, storyboard, voice, and produce content at scale.',
    icon: Sparkles,
    iconBg: 'from-blue-500 to-cyan-500',
    features: [
      { icon: Check, text: 'Photo-real, cinematic, and animated video production' },
      { icon: Check, text: 'AI-generated scripts, images, voices, and video clips' },
      { icon: Check, text: 'Full pipeline: concept → storyboard → final cut' },
      { icon: Check, text: 'Business analytics and IP protection built in' },
    ],
  },
  {
    id: 'starting-point',
    title: 'Two Ways to Begin',
    description:
      'Jump in however feels natural — build your characters first, or describe a story and let AI create the characters for you. Both paths lead to the same powerful production pipeline.',
    icon: BookOpen,
    iconBg: 'from-violet-500 to-purple-600',
    features: [
      { icon: Check, text: 'Character-First: Build profiles, then write or generate scripts around them' },
      { icon: Check, text: 'Story-First: Describe your narrative and AI generates matching characters' },
      { icon: Check, text: 'Either path flows into the same production pipeline' },
      { icon: Check, text: 'Mix and match as your creative process evolves' },
    ],
    tip: 'Not sure where to begin? Start with a story idea — AI will generate character profiles you can refine and expand.',
  },
  {
    id: 'characters',
    title: 'Your Cast of Characters',
    description:
      'Characters are the heart of your production. Detailed profiles drive AI-generated scripts, realistic voiceover, and consistent visual output across every scene.',
    icon: Users,
    iconBg: 'from-green-500 to-emerald-500',
    features: [
      { icon: Check, text: 'AI-generated reference images for each character' },
      { icon: Check, text: 'Assign realistic AI voices per character' },
      { icon: Check, text: 'Define personality, traits, and visual specifications' },
      { icon: Check, text: 'Organize by role: Primary, Ensemble, Recurring, Cameo' },
    ],
    tip: 'The more detail you add to a character, the more consistent they appear across scripts, storyboards, and video.',
  },
  {
    id: 'ai-studio',
    title: 'AI Studio — Generate Everything',
    description:
      'The AI Studio is your creative engine. Generate scripts from story ideas or characters, produce images and backgrounds, clone character voices, and compose video — all in one hub.',
    icon: Wand2,
    iconBg: 'from-amber-500 to-orange-500',
    features: [
      { icon: Check, text: 'Script generation from themes, premises, or characters' },
      { icon: Check, text: 'Image generation for scenes, backgrounds, and props' },
      { icon: Check, text: 'Voice generation with character-specific AI voices' },
      { icon: Check, text: 'Video composition with cinematic shot control' },
    ],
    tip: 'The more character and story context you provide in AI Studio, the more tailored and consistent your outputs will be.',
  },
  {
    id: 'storyboards',
    title: 'Storyboard Your Vision',
    description:
      'Transform any script into a visual shot plan — establishing shots, close-ups, camera angles, and scene transitions — before a single frame of video is generated.',
    icon: Camera,
    iconBg: 'from-purple-500 to-pink-500',
    features: [
      { icon: Check, text: 'Auto-generate storyboards from any script' },
      { icon: Check, text: 'Shot-by-shot breakdown with camera angles and action' },
      { icon: Check, text: 'Visual reference images for each shot' },
      { icon: Check, text: 'Export shot lists for production teams' },
    ],
  },
  {
    id: 'video',
    title: 'Generate Photo-Real Video',
    description:
      'Produce actual video clips — not just cartoons. Scripps AI Studio supports photo-realistic cinematic video, documentary style, and traditional animation, all from the same platform.',
    icon: Video,
    iconBg: 'from-red-500 to-rose-500',
    features: [
      { icon: Check, text: 'Photo-real and cinematic video via Vertex AI VEO3' },
      { icon: Check, text: 'Traditional animation and claymation styles also supported' },
      { icon: Check, text: 'Assemble shots into full episode cuts' },
      { icon: Check, text: 'Lip-sync dialogue to generated video automatically' },
    ],
    tip: 'Choose your visual style per workspace — photoreal, documentary, claymation, or general animation.',
  },
  {
    id: 'production',
    title: 'Production & Business Intelligence',
    description:
      'Track every episode from script to final cut, analyze the economics of your content, and protect your intellectual property — all without leaving the studio.',
    icon: TrendingUp,
    iconBg: 'from-teal-500 to-cyan-600',
    features: [
      { icon: Check, text: 'Episode pipeline management and progress tracking' },
      { icon: Check, text: 'Revenue, cost, and profit analysis per episode' },
      { icon: Check, text: 'IP protection: patents, copyrights, and trademarks' },
      { icon: Check, text: 'Distribution revenue modeling across channels' },
    ],
  },
  {
    id: 'shortcuts',
    title: 'Pro Tips',
    description: 'Use keyboard shortcuts to move faster and navigate the studio with ease.',
    icon: Keyboard,
    iconBg: 'from-gray-600 to-gray-800',
    features: [
      { icon: Command, text: 'Press Cmd/Ctrl + K to open the Command Palette' },
      { icon: Check, text: 'Quick navigation to any page or feature' },
      { icon: Check, text: 'Search for actions across the entire studio' },
      { icon: Check, text: 'Keyboard-first workflow for power users' },
    ],
    tip: 'The Command Palette is your fastest way to navigate the studio without lifting your hands from the keyboard.',
  },
];

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const { isCommercial } = useWorkspaceCapabilities();
  const activeSteps = isCommercial ? COMMERCIAL_STEPS : steps;
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const step = activeSteps[currentStep];
  const isLastStep = currentStep === activeSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev - 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => {
      localStorage.setItem('onboarding_completed', 'true');
      onComplete();
    }, 200);
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(() => {
      localStorage.setItem('onboarding_completed', 'true');
      onSkip();
    }, 200);
  };

  const Icon = step.icon;

  return (
    <div
      className={`fixed inset-0 z-[300] flex items-center justify-center p-4 transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleSkip} />

      <div
        className={`relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden transition-transform duration-200 ${
          isVisible ? 'scale-100' : 'scale-95'
        }`}
      >
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors z-10"
          aria-label="Skip onboarding"
        >
          <X className="w-5 h-5" />
        </button>

        <div className={`h-2 bg-gray-100`}>
          <div
            className="h-full bg-gradient-to-r from-scripps-blue to-scripps-light-blue transition-all duration-300"
            style={{ width: `${((currentStep + 1) / activeSteps.length) * 100}%` }}
          />
        </div>

        <div className={`p-8 transition-opacity duration-150 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          <div className="flex items-start gap-6 mb-8">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.iconBg} flex items-center justify-center flex-shrink-0 shadow-lg`}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="text-sm text-gray-500 font-medium mb-1">
                Step {currentStep + 1} of {activeSteps.length}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h2>
              <p className="text-gray-600">{step.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {step.features.map((feature, index) => {
              const FeatureIcon = feature.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <FeatureIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700">{feature.text}</span>
                </div>
              );
            })}
          </div>

          {step.tip && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Pro tip:</span> {step.tip}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Skip tour
            </button>

            <div className="flex items-center gap-3">
              {!isFirstStep && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium"
              >
                {isLastStep ? 'Get Started' : 'Next'}
                {!isLastStep && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {activeSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsAnimating(true);
                  setTimeout(() => {
                    setCurrentStep(index);
                    setIsAnimating(false);
                  }, 150);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-scripps-blue w-6'
                    : index < currentStep
                    ? 'bg-scripps-blue/50'
                    : 'bg-gray-300'
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');
    if (!completed) {
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  return {
    showOnboarding,
    completeOnboarding: () => setShowOnboarding(false),
    skipOnboarding: () => setShowOnboarding(false),
    resetOnboarding: () => {
      localStorage.removeItem('onboarding_completed');
      setShowOnboarding(true);
    },
  };
}
