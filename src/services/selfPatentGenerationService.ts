import { supabase } from '../lib/supabase';
import { analyzeCodebase, generateApplicationSummary, type CodebaseInventory } from './codebaseAnalysisService';
import { generateText } from './geminiService';
import { createPatentApplication, type CreatePatentInput } from './patentApplicationService';
import { generateCompletePatentApplication, type PatentGenerationProgress } from './patentWorkflowOrchestrator';

export interface SelfPatentProgress {
  stage: 'analyzing' | 'extracting' | 'generating' | 'creating' | 'processing' | 'complete';
  message: string;
  percentage: number;
  details?: string;
}

export interface SelfPatentResult {
  success: boolean;
  applicationId?: string;
  title?: string;
  error?: string;
}

const APPLICATION_TITLE = 'System and Method for AI-Assisted Animation Production with Integrated Patent Generation';

const TECHNICAL_FIELD = `The present invention relates to computer-implemented methods and systems for automated video production, and more particularly to an integrated platform for creating animated content using artificial intelligence models with hierarchical cost optimization, character consistency management, and self-documenting patent generation capabilities. The scope of claims covers all animation styles including but not limited to claymation, stop-motion, 2D traditional, 3D computer-generated, hyper-realistic, and photo-real animation.`;

const PROBLEM_STATEMENT = `Traditional animation production requires extensive manual labor, with typical costs ranging from $50,000-$500,000 per minute of finished content depending on the animation style. Production teams include animators, voice actors, set designers, lighting technicians, and post-production specialists, resulting in production timelines of 6-18 months for a single episode. This cost and time barrier makes professional animation production inaccessible to independent creators and small studios.

Existing animation software provides tools but does not automate the creative pipeline. Current AI video generation services produce isolated clips without maintaining character consistency across scenes or episodes. No existing system integrates script generation, storyboarding, voice synthesis, lip-sync animation, and cost modeling into a unified workflow with multi-organization management that supports multiple animation styles (including claymation, 2D, 3D, and photo-real animation).

Furthermore, software development teams lack tools to automatically generate patent applications for their own inventions by analyzing their codebase, requiring expensive patent attorney consultations and manual documentation of technical features.`;

export async function generateSelfPatentApplication(
  organizationId: string,
  userId: string,
  onProgress?: (progress: SelfPatentProgress) => void
): Promise<SelfPatentResult> {
  try {
    // Stage 1: Analyze codebase
    onProgress?.({
      stage: 'analyzing',
      message: 'Analyzing codebase architecture...',
      percentage: 10,
      details: 'Scanning 132 TypeScript files, 83 database migrations, and service implementations'
    });

    const inventory = await analyzeCodebase(organizationId);

    onProgress?.({
      stage: 'analyzing',
      message: 'Codebase analysis complete',
      percentage: 25,
      details: `Analyzed ${inventory.totalFiles} files with ${inventory.totalLines.toLocaleString()} lines of code`
    });

    // Stage 2: Extract features and generate summary
    onProgress?.({
      stage: 'extracting',
      message: 'Extracting technical features and innovations...',
      percentage: 35,
      details: `Identified ${inventory.features.length} key features and ${inventory.services.length} specialized services`
    });

    const applicationSummary = await generateApplicationSummary(inventory);

    // Stage 3: Generate comprehensive invention description
    onProgress?.({
      stage: 'generating',
      message: 'Generating comprehensive invention description...',
      percentage: 45,
      details: 'Creating detailed technical description with AI assistance'
    });

    const inventionDescription = await generateInventionDescription(inventory, applicationSummary);

    // Stage 4: Extract key features list
    onProgress?.({
      stage: 'generating',
      message: 'Compiling key inventive features...',
      percentage: 55,
      details: `Processing ${inventory.features.length} identified innovations`
    });

    const keyFeatures = await extractKeyFeatures(inventory);

    // Stage 5: Create patent application
    onProgress?.({
      stage: 'creating',
      message: 'Creating patent application record...',
      percentage: 65,
      details: 'Initializing patent application in database'
    });

    const patentApp = await createPatentApplication(organizationId, {
      title: APPLICATION_TITLE,
      inventionDescription,
      technicalField: TECHNICAL_FIELD,
      problemSolved: PROBLEM_STATEMENT,
      keyFeatures
    });

    // Stage 6: Run full patent generation workflow
    onProgress?.({
      stage: 'processing',
      message: 'Running full patent generation workflow...',
      percentage: 70,
      details: 'Generating specification, claims, drawings, and performing prior art analysis'
    });

    const workflowResult = await generateCompletePatentApplication(
      {
        applicationId: patentApp.id,
        organizationId,
        userId,
        title: APPLICATION_TITLE,
        description: inventionDescription,
        skipPriorArtSearch: false,
        useAIClaims: true
      },
      (workflowProgress: PatentGenerationProgress) => {
        const basePercentage = 70;
        const workflowRange = 25;
        const progressPercentage = Math.round(
          basePercentage + (workflowProgress.step / workflowProgress.totalSteps) * workflowRange
        );

        onProgress?.({
          stage: 'processing',
          message: workflowProgress.currentStep,
          percentage: progressPercentage,
          details: `Step ${workflowProgress.step} of ${workflowProgress.totalSteps}`
        });
      }
    );

    if (!workflowResult.success) {
      throw new Error(workflowResult.error || 'Patent generation workflow failed');
    }

    // Stage 7: Complete
    onProgress?.({
      stage: 'complete',
      message: 'Patent application generated successfully!',
      percentage: 100,
      details: 'Application ready for review and refinement'
    });

    return {
      success: true,
      applicationId: patentApp.id,
      title: APPLICATION_TITLE
    };

  } catch (error) {
    console.error('Self-patent generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

async function generateInventionDescription(
  inventory: CodebaseInventory,
  summary: string
): Promise<string> {
  const prompt = `Based on the following codebase analysis, generate a comprehensive 4-5 paragraph invention description for a patent application. The description should explain WHAT the system does, HOW it works at a high level, and WHY it's innovative.

CODEBASE SUMMARY:
${summary}

REQUIREMENTS:
1. First paragraph: Overview of the complete system and its primary purpose
2. Second paragraph: Explain the AI pipeline and workflow automation
3. Third paragraph: Describe unique cost modeling and optimization features
4. Fourth paragraph: Explain the patent generation capabilities (meta-innovation)
5. Fifth paragraph: Summarize the technical advantages and industry impact

Write in clear, professional language suitable for a patent application. Focus on technical innovation and practical benefits.`;

  const description = await generateText(prompt, undefined, {
    temperature: 0.7,
    maxTokens: 2000
  });

  return description.trim();
}

async function extractKeyFeatures(inventory: CodebaseInventory): Promise<string[]> {
  const coreFeatures = [
    'Multi-stage AI pipeline orchestrating script generation, storyboard creation, voice synthesis, and video generation',
    'Hierarchical asset decay system modeling learning curves with configurable decay rates and floor values',
    'Character consistency management using canonical descriptions and reference image URIs',
    'Prompt template versioning with atomic deployment switching and organization-level overrides',
    'Real-time episode progress tracking aggregating status across distributed job queues',
    'Multi-tiered cost comparison engine analyzing AI-assisted vs. traditional vs. creator-level production costs',
    'Intelligent batch recommendation system optimizing processing costs and throughput',
    'Script-to-shot extraction with automated dialogue mapping and character attribution',
    'Multi-provider lip sync orchestration with unified status tracking',
    'Translation export system with language-specific formatting and RTL support',
    'Gemini API usage tracking with granular token accounting per feature area',
    'Multi-organization data isolation using PostgreSQL Row Level Security',
    'Automated patent specification generation using AI language models',
    'Real-time prior art search engine with relevance scoring and similarity analysis',
    'Feature-based novelty scoring algorithm comparing extracted features against prior art',
    'Codebase feature extraction with technical mapping and classification',
    'AI-assisted patent claims drafting with proper legal structure',
    'Programmatic technical drawing generation for USPTO-compliant figures',
    'Self-examining patent generation system that analyzes its own codebase',
    'Lifetime value projections with revenue modeling and ROI calculations'
  ];

  return coreFeatures;
}

export async function quickGenerateSelfPatent(
  organizationId: string,
  userId: string
): Promise<string> {
  // Simplified version that creates the patent application immediately
  // and queues the full analysis for background processing

  const patentApp = await createPatentApplication(organizationId, {
    title: APPLICATION_TITLE,
    inventionDescription: 'Self-examination in progress... Full description will be generated automatically.',
    technicalField: TECHNICAL_FIELD,
    problemSolved: PROBLEM_STATEMENT,
    keyFeatures: [
      'AI-powered animation production pipeline',
      'Hierarchical cost optimization',
      'Character consistency management',
      'Self-documenting patent generation'
    ]
  });

  // Trigger background analysis
  setTimeout(async () => {
    try {
      await generateSelfPatentApplication(organizationId, userId);
    } catch (error) {
      console.error('Background patent generation failed:', error);
    }
  }, 1000);

  return patentApp.id;
}

export async function checkExistingSelfPatent(organizationId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('patent_applications')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('title', APPLICATION_TITLE)
    .maybeSingle();

  if (error) {
    console.error('Error checking for existing self-patent:', error);
    return null;
  }

  return data?.id || null;
}
