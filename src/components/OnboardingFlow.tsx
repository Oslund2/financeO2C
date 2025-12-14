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
  ArrowRight,
  Settings,
  Camera,
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
    description: 'Your complete animation production platform powered by AI. Let us show you around.',
    icon: Sparkles,
    iconBg: 'from-blue-500 to-cyan-500',
    features: [
      { icon: Check, text: 'Generate scripts with AI' },
      { icon: Check, text: 'Create visual storyboards' },
      { icon: Check, text: 'Manage characters and assets' },
      { icon: Check, text: 'Track production progress' },
    ],
  },
  {
    id: 'characters',
    title: 'Create Your Characters',
    description: 'Build your animated cast with detailed character profiles, voice settings, and reference images.',
    icon: Users,
    iconBg: 'from-green-500 to-emerald-500',
    features: [
      { icon: Check, text: 'Define character personalities and traits' },
      { icon: Check, text: 'Upload reference images' },
      { icon: Check, text: 'Configure AI voices for each character' },
      { icon: Check, text: 'Organize by role: Primary, Ensemble, Recurring' },
    ],
    tip: 'Start with your main characters to get the most out of AI-generated scripts.',
  },
  {
    id: 'scripts',
    title: 'Generate Scripts with AI',
    description: 'Use the AI Studio to create professional scripts tailored to your characters and themes.',
    icon: FileText,
    iconBg: 'from-amber-500 to-orange-500',
    features: [
      { icon: Check, text: 'AI-powered script generation' },
      { icon: Check, text: 'Automatic character integration' },
      { icon: Check, text: 'Scene and act breakdown' },
      { icon: Check, text: 'Dialogue with voice timing' },
    ],
    tip: 'The more character details you provide, the better your AI scripts will be.',
  },
  {
    id: 'storyboards',
    title: 'Visualize Your Story',
    description: 'Transform scripts into visual storyboards with shot-by-shot breakdowns.',
    icon: Camera,
    iconBg: 'from-purple-500 to-pink-500',
    features: [
      { icon: Check, text: 'Generate storyboards from scripts' },
      { icon: Check, text: 'Shot list with camera angles' },
      { icon: Check, text: 'Visual reference for each scene' },
      { icon: Check, text: 'Export for production teams' },
    ],
  },
  {
    id: 'production',
    title: 'Track Production',
    description: 'Monitor your episodes from script to final video with detailed progress tracking.',
    icon: Film,
    iconBg: 'from-red-500 to-rose-500',
    features: [
      { icon: Check, text: 'Episode pipeline management' },
      { icon: Check, text: 'Progress percentage tracking' },
      { icon: Check, text: 'Cost estimation and analytics' },
      { icon: Check, text: 'Profit per episode calculations' },
    ],
  },
  {
    id: 'shortcuts',
    title: 'Pro Tips',
    description: 'Use keyboard shortcuts to work faster and navigate with ease.',
    icon: Keyboard,
    iconBg: 'from-gray-600 to-gray-800',
    features: [
      { icon: Command, text: 'Press Cmd/Ctrl + K to open Command Palette' },
      { icon: Check, text: 'Quick navigation to any page' },
      { icon: Check, text: 'Search for actions and features' },
      { icon: Check, text: 'Keyboard-first workflow' },
    ],
    tip: 'The Command Palette is your fastest way to navigate the app.',
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
