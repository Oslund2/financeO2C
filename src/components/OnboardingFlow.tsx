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
} from 'lucide-react';

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
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
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
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className={`p-8 transition-opacity duration-150 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          <div className="flex items-start gap-6 mb-8">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.iconBg} flex items-center justify-center flex-shrink-0 shadow-lg`}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="text-sm text-gray-500 font-medium mb-1">
                Step {currentStep + 1} of {steps.length}
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
            {steps.map((_, index) => (
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
