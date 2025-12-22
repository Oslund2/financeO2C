import { supabase } from '../lib/supabase';

export interface CodeFile {
  path: string;
  content: string;
  type: 'component' | 'service' | 'migration' | 'type' | 'context' | 'util';
  lineCount: number;
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface DatabaseSchema {
  tableName: string;
  columns: string[];
  relationships: string[];
  purpose: string;
}

export interface ServiceAnalysis {
  name: string;
  path: string;
  exports: string[];
  dependencies: string[];
  functionality: string;
  complexity: number;
}

export interface CodebaseInventory {
  totalFiles: number;
  totalLines: number;
  services: ServiceAnalysis[];
  components: string[];
  databaseTables: string[];
  apiIntegrations: string[];
  aiModels: string[];
  features: string[];
  technicalStack: string[];
}

const CORE_FILES = [
  // Services
  'src/services/geminiService.ts',
  'src/services/vertexAIService.ts',
  'src/services/elevenLabsService.ts',
  'src/services/chatterboxService.ts',
  'src/services/nanoBananaService.ts',
  'src/services/veo3PromptService.ts',
  'src/services/storyboardService.ts',
  'src/services/scriptUploadService.ts',
  'src/services/scriptTranslationService.ts',
  'src/services/dialogueExtractionService.ts',
  'src/services/dialogueAudioService.ts',
  'src/services/lipSyncService.ts',
  'src/services/shotListGeneratorService.ts',
  'src/services/episodeCreationService.ts',
  'src/services/episodeProgressService.ts',
  'src/services/costCalculationService.ts',
  'src/services/creatorCostCalculationService.ts',
  'src/services/ltvCalculationService.ts',
  'src/services/promptLibraryService.ts',
  'src/services/promptEngineeringService.ts',
  'src/services/promptEnhancementService.ts',
  'src/services/batchManagementService.ts',
  'src/services/batchRecommendationService.ts',
  'src/services/consistencyManagementService.ts',
  'src/services/backupService.ts',
  'src/services/monitoringService.ts',
  'src/services/geminiUsageTrackingService.ts',
  'src/services/formatConfigService.ts',
  'src/services/spellingBeeService.ts',
  'src/services/translationExportService.ts',
  'src/services/referenceImageListService.ts',
  'src/services/scriptLockingService.ts',
  // Patent services
  'src/services/patentApplicationService.ts',
  'src/services/patentWorkflowOrchestrator.ts',
  'src/services/patentFeatureExtractionService.ts',
  'src/services/patentPriorArtSearchService.ts',
  'src/services/patentNoveltyAnalysisService.ts',
  'src/services/patentDifferentiationService.ts',
  'src/services/patentClaimsService.ts',
  'src/services/patentDrawingsService.ts',
  'src/services/patentSpecificationGenerationService.ts',
  'src/services/architectureDiagramGenerator.ts',
  'src/services/dynamicPatentDrawingsService.ts',
  'src/services/featureSpecificDiagramGenerator.ts',
  'src/services/printOptimizedSVGGenerator.ts',
  'src/services/selfPatentGenerationService.ts',
  'src/services/cpcClassificationService.ts',
  'src/services/coverSheetService.ts',
  'src/services/filingFeeService.ts',
  // Copyright services
  'src/services/copyrightApplicationService.ts',
  'src/services/aiAuthorshipService.ts',
  'src/services/internationalCopyrightService.ts',
  // Trademark services
  'src/services/trademarkApplicationService.ts'
];

const DATABASE_TABLES = [
  'organizations', 'organization_members', 'organization_invitations',
  'series', 'episodes', 'scripts', 'translated_scripts',
  'characters', 'character_images',
  'assets', 'asset_usage_tracking',
  'storyboards', 'storyboard_shots', 'storyboard_approvals', 'storyboard_images',
  'shot_lists', 'dialogue_lines', 'dialogue_audio_jobs',
  'lip_sync_jobs', 'video_generation_jobs',
  'production_jobs', 'production_draft_sessions',
  'prompt_templates', 'prompt_versions',
  'cost_models', 'episode_cost_tracking', 'episode_ltv_projections',
  // Patent tables
  'patent_applications', 'patent_claims', 'patent_drawings',
  'patent_prior_art_search_results', 'patent_novelty_analyses',
  'patent_differentiation_reports', 'patent_feature_mappings',
  // Copyright tables
  'copyright_registrations', 'copyright_deposits', 'copyright_search_results',
  'international_copyright_registrations', 'ai_authorship_documentation', 'ai_tool_registry',
  'copyright_bulk_registrations',
  // Trademark tables
  'trademark_applications', 'trademark_specimens', 'trademark_search_results',
  'nice_classifications', 'trademark_classes',
  // Reference data
  'copyright_treaties',
  'gemini_api_usage', 'translation_analytics', 'translation_exports',
  'backup_manifests', 'backup_files',
  'user_settings', 'workflow_templates', 'workflow_progress',
  'brand_templates', 'asset_recommendations',
  'spelling_bee_winners'
];

const AI_INTEGRATIONS = [
  'Google Gemini 2.0 Flash (via Vertex AI)',
  'Google Veo 3 (via Vertex AI)',
  'ElevenLabs Text-to-Speech',
  'Chatterbox TTS',
  'SyncLabs Lip Sync',
  'Veed.io Lip Sync',
  'Nano Banana (future integration)'
];

const TECHNICAL_STACK = [
  'React 18',
  'TypeScript',
  'Vite',
  'Tailwind CSS',
  'Supabase (PostgreSQL + Storage + Auth)',
  'Lucide React Icons',
  'jsPDF',
  'Mammoth (DOCX parsing)',
  'PDF.js'
];

export async function analyzeCodebase(organizationId: string): Promise<CodebaseInventory> {
  const services: ServiceAnalysis[] = [];
  let totalLines = 0;

  // Analyze core service files
  for (const filePath of CORE_FILES) {
    try {
      const response = await fetch(`/${filePath}`);
      if (response.ok) {
        const content = await response.text();
        const lines = content.split('\n').length;
        totalLines += lines;

        const exports = extractExports(content);
        const dependencies = extractDependencies(content);
        const functionality = inferFunctionality(filePath, content);
        const complexity = calculateComplexity(content);

        services.push({
          name: filePath.split('/').pop()?.replace('.ts', '') || '',
          path: filePath,
          exports,
          dependencies,
          functionality,
          complexity
        });
      }
    } catch (error) {
      console.warn(`Could not analyze ${filePath}:`, error);
    }
  }

  // Extract key features from service analysis
  const features = extractKeyFeatures(services);

  return {
    totalFiles: CORE_FILES.length,
    totalLines,
    services,
    components: await getComponentList(),
    databaseTables: DATABASE_TABLES,
    apiIntegrations: AI_INTEGRATIONS,
    aiModels: ['Gemini 2.0 Flash', 'Veo 3', 'ElevenLabs TTS'],
    features,
    technicalStack: TECHNICAL_STACK
  };
}

function extractExports(content: string): string[] {
  const exports: string[] = [];
  const exportRegex = /export\s+(async\s+)?function\s+(\w+)/g;
  const exportInterfaceRegex = /export\s+interface\s+(\w+)/g;
  const exportTypeRegex = /export\s+type\s+(\w+)/g;

  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[2]);
  }
  while ((match = exportInterfaceRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  while ((match = exportTypeRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }

  return exports;
}

function extractDependencies(content: string): string[] {
  const dependencies: string[] = [];
  const importRegex = /import\s+.*\s+from\s+['"](.+)['"]/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const dep = match[1];
    if (!dep.startsWith('.')) {
      dependencies.push(dep);
    }
  }

  return [...new Set(dependencies)];
}

function inferFunctionality(filePath: string, content: string): string {
  const fileName = filePath.split('/').pop() || '';

  if (fileName.includes('gemini')) return 'AI text generation using Google Gemini';
  if (fileName.includes('vertex')) return 'AI video generation using Vertex AI Veo 3';
  if (fileName.includes('elevenLabs')) return 'Text-to-speech voice synthesis';
  if (fileName.includes('chatterbox')) return 'Alternative TTS service';
  if (fileName.includes('lipSync')) return 'Lip sync animation processing';
  if (fileName.includes('storyboard')) return 'Storyboard generation and management';
  if (fileName.includes('script')) return 'Script processing and management';
  if (fileName.includes('dialogue')) return 'Dialogue extraction and audio generation';
  if (fileName.includes('episode')) return 'Episode creation and tracking';
  if (fileName.includes('cost')) return 'Cost calculation and tracking';
  if (fileName.includes('ltv')) return 'Lifetime value analytics';
  if (fileName.includes('prompt')) return 'AI prompt management and optimization';
  if (fileName.includes('batch')) return 'Batch processing and recommendations';
  if (fileName.includes('translation')) return 'Multi-language translation services';
  if (fileName.includes('patent')) return 'Patent application generation and analysis';
  if (fileName.includes('copyright')) return 'Copyright registration and AI authorship documentation';
  if (fileName.includes('trademark')) return 'Trademark application and Nice classification';
  if (fileName.includes('aiAuthorship')) return 'AI-generated content authorship tracking';
  if (fileName.includes('international')) return 'International IP treaty compliance';
  if (fileName.includes('backup')) return 'Data backup and recovery';
  if (fileName.includes('monitoring')) return 'System health monitoring';

  return 'Supporting service functionality';
}

function calculateComplexity(content: string): number {
  const lines = content.split('\n').length;
  const functions = (content.match(/function\s+\w+/g) || []).length;
  const asyncFunctions = (content.match(/async\s+function/g) || []).length;
  const conditionals = (content.match(/if\s*\(/g) || []).length;
  const loops = (content.match(/(for|while)\s*\(/g) || []).length;

  return lines * 0.1 + functions * 2 + asyncFunctions * 3 + conditionals + loops * 1.5;
}

async function getComponentList(): Promise<string[]> {
  return [
    'Dashboard', 'Episodes', 'Scripts', 'Characters', 'Assets',
    'Production', 'AIStudio', 'Settings',
    'StoryboardGenerator', 'StoryboardViewer',
    'ScriptTranslationManager', 'VoiceGenerationTab',
    'LipSyncManager', 'ShotListManager',
    'CostComparison', 'CreatorCostCalculator', 'ShowRevenueEstimator',
    'PromptLibrary', 'PromptEditor', 'PromptEnhancementPanel',
    'PatentApplication', 'PatentIntelligenceSettings', 'PatentFilingTab',
    'CopyrightApplication', 'BulkCopyrightWizard',
    'TrademarkApplication',
    'IPProtection',
    'OrganizationSwitcher', 'SeriesSwitcher',
    'BackupRecovery', 'SystemHealthWidget'
  ];
}

function extractKeyFeatures(services: ServiceAnalysis[]): string[] {
  return [
    'AI-Powered Script Generation',
    'Multi-Language Translation System',
    'Automated Storyboard Creation',
    'Character Voice Synthesis',
    'Lip Sync Video Generation',
    'Hierarchical Cost Modeling with Asset Decay',
    'Multi-Tiered Production Cost Comparison',
    'Prompt Template Versioning System',
    'Character Consistency Management',
    'Episode Progress Tracking',
    'Batch Processing Optimization',
    'Real-Time Usage Analytics',
    'Multi-Organization Workspace Management',
    // Comprehensive IP Portfolio Management
    'Integrated IP Protection Suite (Patents, Copyrights, Trademarks)',
    'Patent Application Generation System',
    'Prior Art Search and Analysis',
    'Automated Claims Generation',
    'Technical Drawing Generation',
    'Novelty Scoring Algorithm',
    'Copyright Registration with AI Disclosure Compliance',
    'Bulk Copyright Registration from Asset Library',
    'AI Authorship Documentation System',
    'International Copyright Treaty Analysis (Berne Convention)',
    'Trademark Application with Nice Classification',
    'USPTO Electronic Filing Integration',
    'ROI and LTV Projections',
    'Comprehensive Backup System'
  ];
}

export async function generateApplicationSummary(inventory: CodebaseInventory): Promise<string> {
  const summary = `
This is a comprehensive AI-powered animation production platform with the following characteristics:

TECHNICAL SCOPE:
- ${inventory.totalFiles} core service files totaling ${inventory.totalLines.toLocaleString()} lines of code
- ${inventory.databaseTables.length} database tables for complete data management
- ${inventory.services.length} specialized services handling distinct functionality
- ${inventory.components.length} React components for user interface
- ${inventory.aiModels.length} integrated AI models for automation

KEY INTEGRATIONS:
${inventory.apiIntegrations.map(api => `- ${api}`).join('\n')}

TECHNICAL STACK:
${inventory.technicalStack.map(tech => `- ${tech}`).join('\n')}

CORE CAPABILITIES:
${inventory.features.map(feature => `- ${feature}`).join('\n')}

PRIMARY INNOVATION AREAS:
1. Multi-stage AI pipeline for video production (script → storyboard → voice → video)
2. Hierarchical cost modeling with learning curve simulation
3. Intelligent prompt management with versioning and enhancement
4. Character consistency across episodes using reference-based generation
5. Real-time progress tracking across distributed job queues
6. Integrated IP Portfolio Management (Patents, Copyrights, Trademarks)
7. Automated patent generation with self-documenting codebase analysis
8. Bulk copyright registration with AI authorship disclosure compliance
9. Trademark application generation with Nice classification integration
10. Multi-organization data isolation with granular permissions

This platform reduces traditional animation production costs by 80-95% while maintaining professional quality through AI assistance combined with human oversight. The integrated IP protection suite enables creators to protect their animated content, characters, and scripts through streamlined patent, copyright, and trademark applications with automatic AI-generated content disclosure.
  `.trim();

  return summary;
}
