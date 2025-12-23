import { createPatentDrawing, deleteAllDrawingsForApplication } from './patentApplicationService';
import type { PatentDrawing, DrawingCallout } from './patentApplicationService';
import { extractCodebaseFeatures, type ExtractedFeature } from './patentFeatureExtractionService';
import { analyzeDomain, planDrawingFigures, type DrawingSpec } from './dynamicPatentDrawingsService';
import { generateSystemArchitecture } from './architectureDiagramGenerator';
import {
  generateAlgorithmFlowchart,
  generateDataStructureDiagram,
  generateIntegrationDiagram,
  generateWorkflowDiagram,
  generateUIWireframe
} from './featureSpecificDiagramGenerator';

interface BlockElement {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  calloutNumber: number;
}

interface ArrowConnection {
  from: string;
  to: string;
  label?: string;
  bidirectional?: boolean;
}

interface DiagramDefinition {
  figureNumber: number;
  title: string;
  description: string;
  drawingType: PatentDrawing['drawing_type'];
  blocks: BlockElement[];
  arrows: ArrowConnection[];
  width: number;
  height: number;
}

const FIGURE_DEFINITIONS: DiagramDefinition[] = [
  {
    figureNumber: 1,
    title: 'Integrated System Architecture',
    description: 'FIG. 1 is a block diagram illustrating the high-level system architecture of the integrated AI video production and patent management system according to an embodiment of the present invention.',
    drawingType: 'block_diagram',
    width: 900,
    height: 680,
    blocks: [
      { id: 'client', label: 'Client\nApplication', x: 375, y: 20, width: 150, height: 50, calloutNumber: 100 },
      { id: 'frontend', label: 'User Interface\nLayer', x: 375, y: 100, width: 150, height: 50, calloutNumber: 102 },
      { id: 'auth', label: 'Authentication\n& RLS', x: 50, y: 180, width: 140, height: 60, calloutNumber: 104 },
      { id: 'database', label: 'Multi-Tenant\nDatabase', x: 50, y: 270, width: 140, height: 70, calloutNumber: 106 },
      { id: 'video_orch', label: 'Video Production\nOrchestrator', x: 230, y: 180, width: 140, height: 60, calloutNumber: 108 },
      { id: 'patent_orch', label: 'Patent\nWorkflow\nOrchestrator', x: 520, y: 180, width: 140, height: 60, calloutNumber: 110 },
      { id: 'prompt', label: 'Prompt\nLibrary\nSystem', x: 700, y: 180, width: 150, height: 60, calloutNumber: 112 },
      { id: 'image', label: 'Image\nGeneration', x: 50, y: 400, width: 120, height: 60, calloutNumber: 114 },
      { id: 'voice', label: 'Voice\nSynthesis', x: 190, y: 400, width: 120, height: 60, calloutNumber: 116 },
      { id: 'lipsync', label: 'Lip Sync\nEngine', x: 330, y: 400, width: 120, height: 60, calloutNumber: 118 },
      { id: 'video', label: 'Video\nGeneration', x: 50, y: 490, width: 120, height: 60, calloutNumber: 120 },
      { id: 'feature', label: 'Feature\nExtraction', x: 480, y: 400, width: 130, height: 60, calloutNumber: 122 },
      { id: 'prior_art', label: 'Prior Art\nSearch', x: 630, y: 400, width: 110, height: 60, calloutNumber: 124 },
      { id: 'novelty', label: 'Novelty\nAnalysis', x: 760, y: 400, width: 110, height: 60, calloutNumber: 126 },
      { id: 'spec_gen', label: 'Specification\nGenerator', x: 480, y: 490, width: 130, height: 60, calloutNumber: 128 },
      { id: 'drawings', label: 'Drawing\nGenerator', x: 630, y: 490, width: 110, height: 60, calloutNumber: 130 },
      { id: 'claims', label: 'Claims\nEngine', x: 760, y: 490, width: 110, height: 60, calloutNumber: 132 },
      { id: 'cost', label: 'Cost\nCalculation\nEngine', x: 375, y: 580, width: 150, height: 70, calloutNumber: 134 },
      { id: 'ai', label: 'AI Model\nServices\n(Gemini, GPT)', x: 375, y: 280, width: 150, height: 70, calloutNumber: 136 }
    ],
    arrows: [
      { from: 'client', to: 'frontend' },
      { from: 'frontend', to: 'video_orch' },
      { from: 'frontend', to: 'patent_orch' },
      { from: 'auth', to: 'frontend' },
      { from: 'auth', to: 'database' },
      { from: 'video_orch', to: 'database', bidirectional: true },
      { from: 'patent_orch', to: 'database', bidirectional: true },
      { from: 'video_orch', to: 'ai' },
      { from: 'patent_orch', to: 'ai' },
      { from: 'video_orch', to: 'prompt' },
      { from: 'patent_orch', to: 'prompt' },
      { from: 'video_orch', to: 'image' },
      { from: 'video_orch', to: 'voice' },
      { from: 'video_orch', to: 'lipsync' },
      { from: 'lipsync', to: 'video' },
      { from: 'patent_orch', to: 'feature' },
      { from: 'patent_orch', to: 'prior_art' },
      { from: 'patent_orch', to: 'novelty' },
      { from: 'feature', to: 'spec_gen' },
      { from: 'prior_art', to: 'novelty' },
      { from: 'novelty', to: 'spec_gen' },
      { from: 'novelty', to: 'claims' },
      { from: 'spec_gen', to: 'drawings' },
      { from: 'video_orch', to: 'cost' },
      { from: 'patent_orch', to: 'cost' }
    ]
  },
  {
    figureNumber: 2,
    title: 'Script-to-Storyboard Workflow',
    description: 'FIG. 2 is a flowchart illustrating the script-to-storyboard generation workflow according to an embodiment of the present invention.',
    drawingType: 'flowchart',
    width: 700,
    height: 700,
    blocks: [
      { id: 'start', label: 'Receive\nScript Input', x: 275, y: 20, width: 150, height: 50, calloutNumber: 200 },
      { id: 'parse', label: 'Parse Script\nStructure', x: 275, y: 100, width: 150, height: 50, calloutNumber: 202 },
      { id: 'extract', label: 'Extract Acts,\nScenes, Dialogue', x: 275, y: 180, width: 150, height: 50, calloutNumber: 204 },
      { id: 'chars', label: 'Load Character\nProfiles', x: 275, y: 260, width: 150, height: 50, calloutNumber: 206 },
      { id: 'shots', label: 'Generate\nShot List', x: 275, y: 340, width: 150, height: 50, calloutNumber: 208 },
      { id: 'prompts', label: 'Construct\nImage Prompts', x: 275, y: 420, width: 150, height: 50, calloutNumber: 210 },
      { id: 'generate', label: 'Generate\nStoryboard Images', x: 275, y: 500, width: 150, height: 50, calloutNumber: 212 },
      { id: 'store', label: 'Store in\nDatabase', x: 275, y: 580, width: 150, height: 50, calloutNumber: 214 },
      { id: 'style', label: 'Style Guide\nReferences', x: 500, y: 340, width: 130, height: 50, calloutNumber: 216 },
      { id: 'cache', label: 'Prompt\nCache', x: 500, y: 420, width: 130, height: 50, calloutNumber: 218 }
    ],
    arrows: [
      { from: 'start', to: 'parse' },
      { from: 'parse', to: 'extract' },
      { from: 'extract', to: 'chars' },
      { from: 'chars', to: 'shots' },
      { from: 'shots', to: 'prompts' },
      { from: 'prompts', to: 'generate' },
      { from: 'generate', to: 'store' },
      { from: 'style', to: 'shots' },
      { from: 'cache', to: 'prompts' }
    ]
  },
  {
    figureNumber: 3,
    title: 'Character Consistency Pipeline',
    description: 'FIG. 3 is a block diagram illustrating the character consistency management pipeline according to an embodiment of the present invention.',
    drawingType: 'block_diagram',
    width: 750,
    height: 500,
    blocks: [
      { id: 'profile', label: 'Character\nProfile\nDatabase', x: 50, y: 180, width: 140, height: 80, calloutNumber: 300 },
      { id: 'manager', label: 'Consistency\nManager', x: 280, y: 190, width: 140, height: 60, calloutNumber: 302 },
      { id: 'refimg', label: 'Reference\nImage\nStorage', x: 50, y: 60, width: 140, height: 70, calloutNumber: 304 },
      { id: 'style', label: 'Series\nStyle Guide', x: 50, y: 310, width: 140, height: 60, calloutNumber: 306 },
      { id: 'builder', label: 'Prompt\nBuilder', x: 500, y: 190, width: 140, height: 60, calloutNumber: 308 },
      { id: 'output', label: 'Consistent\nImage Output', x: 500, y: 320, width: 140, height: 60, calloutNumber: 310 },
      { id: 'attrs', label: 'Physical\nAttributes', x: 280, y: 60, width: 140, height: 50, calloutNumber: 312 },
      { id: 'voice', label: 'Voice\nProfile', x: 280, y: 320, width: 140, height: 50, calloutNumber: 314 }
    ],
    arrows: [
      { from: 'profile', to: 'manager' },
      { from: 'refimg', to: 'manager' },
      { from: 'style', to: 'manager' },
      { from: 'manager', to: 'builder' },
      { from: 'builder', to: 'output' },
      { from: 'attrs', to: 'manager' },
      { from: 'voice', to: 'manager' }
    ]
  },
  {
    figureNumber: 4,
    title: 'Voice Synthesis and Lip Sync Flow',
    description: 'FIG. 4 is a block diagram illustrating the voice synthesis and lip synchronization workflow according to an embodiment of the present invention.',
    drawingType: 'block_diagram',
    width: 800,
    height: 500,
    blocks: [
      { id: 'dialogue', label: 'Dialogue\nText Input', x: 50, y: 200, width: 130, height: 60, calloutNumber: 400 },
      { id: 'voicesel', label: 'Voice\nProfile\nSelector', x: 220, y: 140, width: 130, height: 60, calloutNumber: 402 },
      { id: 'provider', label: 'Provider\nAbstraction\nLayer', x: 220, y: 240, width: 130, height: 70, calloutNumber: 404 },
      { id: 'eleven', label: 'ElevenLabs\nService', x: 400, y: 120, width: 120, height: 50, calloutNumber: 406 },
      { id: 'chatter', label: 'Chatterbox\nService', x: 400, y: 200, width: 120, height: 50, calloutNumber: 408 },
      { id: 'audio', label: 'Audio\nOutput', x: 400, y: 300, width: 120, height: 50, calloutNumber: 410 },
      { id: 'charimg', label: 'Character\nReference\nImage', x: 560, y: 120, width: 120, height: 60, calloutNumber: 412 },
      { id: 'lipsync', label: 'Lip Sync\nProcessor', x: 560, y: 240, width: 120, height: 60, calloutNumber: 414 },
      { id: 'video', label: 'Synced Video\nOutput', x: 560, y: 360, width: 120, height: 50, calloutNumber: 416 }
    ],
    arrows: [
      { from: 'dialogue', to: 'voicesel' },
      { from: 'dialogue', to: 'provider' },
      { from: 'voicesel', to: 'provider' },
      { from: 'provider', to: 'eleven' },
      { from: 'provider', to: 'chatter' },
      { from: 'eleven', to: 'audio' },
      { from: 'chatter', to: 'audio' },
      { from: 'audio', to: 'lipsync' },
      { from: 'charimg', to: 'lipsync' },
      { from: 'lipsync', to: 'video' }
    ]
  },
  {
    figureNumber: 5,
    title: 'Video Generation and Assembly Workflow',
    description: 'FIG. 5 is a flowchart illustrating the video generation and assembly workflow according to an embodiment of the present invention.',
    drawingType: 'flowchart',
    width: 700,
    height: 600,
    blocks: [
      { id: 'storyboard', label: 'Approved\nStoryboard', x: 275, y: 20, width: 150, height: 50, calloutNumber: 500 },
      { id: 'shots', label: 'Shot\nSequence', x: 275, y: 100, width: 150, height: 50, calloutNumber: 502 },
      { id: 'audio', label: 'Generate\nDialogue Audio', x: 100, y: 200, width: 140, height: 50, calloutNumber: 504 },
      { id: 'lipsync', label: 'Generate\nLip Sync', x: 275, y: 200, width: 150, height: 50, calloutNumber: 506 },
      { id: 'video', label: 'Generate\nVideo Clips', x: 460, y: 200, width: 140, height: 50, calloutNumber: 508 },
      { id: 'queue', label: 'Job\nQueue', x: 275, y: 300, width: 150, height: 50, calloutNumber: 510 },
      { id: 'assemble', label: 'Assemble\nTimeline', x: 275, y: 380, width: 150, height: 50, calloutNumber: 512 },
      { id: 'render', label: 'Final\nRender', x: 275, y: 460, width: 150, height: 50, calloutNumber: 514 },
      { id: 'output', label: 'Completed\nEpisode', x: 275, y: 540, width: 150, height: 50, calloutNumber: 516 }
    ],
    arrows: [
      { from: 'storyboard', to: 'shots' },
      { from: 'shots', to: 'audio' },
      { from: 'shots', to: 'lipsync' },
      { from: 'shots', to: 'video' },
      { from: 'audio', to: 'queue' },
      { from: 'lipsync', to: 'queue' },
      { from: 'video', to: 'queue' },
      { from: 'queue', to: 'assemble' },
      { from: 'assemble', to: 'render' },
      { from: 'render', to: 'output' }
    ]
  },
  {
    figureNumber: 6,
    title: 'Prompt Resolution System with Caching',
    description: 'FIG. 6 is a block diagram illustrating the prompt resolution system with multi-level caching according to an embodiment of the present invention.',
    drawingType: 'block_diagram',
    width: 750,
    height: 500,
    blocks: [
      { id: 'request', label: 'Prompt\nRequest', x: 50, y: 200, width: 120, height: 50, calloutNumber: 600 },
      { id: 'memcache', label: 'In-Memory\nCache', x: 220, y: 120, width: 130, height: 50, calloutNumber: 602 },
      { id: 'resolver', label: 'Prompt\nResolver', x: 220, y: 200, width: 130, height: 60, calloutNumber: 604 },
      { id: 'orgdb', label: 'Organization\nPrompts', x: 400, y: 120, width: 130, height: 50, calloutNumber: 606 },
      { id: 'sysdb', label: 'System\nDefaults', x: 400, y: 200, width: 130, height: 50, calloutNumber: 608 },
      { id: 'version', label: 'Version\nManager', x: 400, y: 290, width: 130, height: 50, calloutNumber: 610 },
      { id: 'interpolate', label: 'Variable\nInterpolation', x: 580, y: 200, width: 130, height: 50, calloutNumber: 612 },
      { id: 'output', label: 'Resolved\nPrompt', x: 580, y: 300, width: 130, height: 50, calloutNumber: 614 }
    ],
    arrows: [
      { from: 'request', to: 'memcache' },
      { from: 'request', to: 'resolver' },
      { from: 'memcache', to: 'resolver' },
      { from: 'resolver', to: 'orgdb' },
      { from: 'resolver', to: 'sysdb' },
      { from: 'orgdb', to: 'version' },
      { from: 'sysdb', to: 'version' },
      { from: 'version', to: 'interpolate' },
      { from: 'interpolate', to: 'output' }
    ]
  },
  {
    figureNumber: 7,
    title: 'Cost Calculation Flowchart',
    description: 'FIG. 7 is a flowchart illustrating the cost calculation process with asset decay modeling according to an embodiment of the present invention.',
    drawingType: 'flowchart',
    width: 700,
    height: 650,
    blocks: [
      { id: 'input', label: 'Episode\nParameters', x: 275, y: 20, width: 150, height: 50, calloutNumber: 700 },
      { id: 'base', label: 'Calculate\nBase AI Costs', x: 275, y: 100, width: 150, height: 50, calloutNumber: 702 },
      { id: 'human', label: 'Calculate\nHuman Costs', x: 275, y: 180, width: 150, height: 50, calloutNumber: 704 },
      { id: 'decay', label: 'Apply\nDecay Factor', x: 275, y: 260, width: 150, height: 50, calloutNumber: 706 },
      { id: 'formula', label: 'max(floor,\nrate^(ep-1))', x: 480, y: 260, width: 130, height: 50, calloutNumber: 708 },
      { id: 'total', label: 'Sum\nTotal Cost', x: 275, y: 340, width: 150, height: 50, calloutNumber: 710 },
      { id: 'trad', label: 'Calculate\nTraditional Cost', x: 100, y: 420, width: 140, height: 50, calloutNumber: 712 },
      { id: 'compare', label: 'Generate\nComparison', x: 275, y: 420, width: 150, height: 50, calloutNumber: 714 },
      { id: 'freelance', label: 'Calculate\nFreelance Cost', x: 460, y: 420, width: 140, height: 50, calloutNumber: 716 },
      { id: 'savings', label: 'Calculate\nSavings', x: 275, y: 500, width: 150, height: 50, calloutNumber: 718 },
      { id: 'output', label: 'Cost\nReport', x: 275, y: 580, width: 150, height: 50, calloutNumber: 720 }
    ],
    arrows: [
      { from: 'input', to: 'base' },
      { from: 'base', to: 'human' },
      { from: 'human', to: 'decay' },
      { from: 'formula', to: 'decay' },
      { from: 'decay', to: 'total' },
      { from: 'total', to: 'compare' },
      { from: 'trad', to: 'compare' },
      { from: 'freelance', to: 'compare' },
      { from: 'compare', to: 'savings' },
      { from: 'savings', to: 'output' }
    ]
  },
  {
    figureNumber: 8,
    title: 'Integrated Dashboard Interface',
    description: 'FIG. 8 is a simplified wireframe illustration of the integrated production and IP protection dashboard user interface according to an embodiment of the present invention.',
    drawingType: 'wireframe',
    width: 900,
    height: 600,
    blocks: [
      { id: 'header', label: 'Global Navigation Bar with Organization Selector', x: 50, y: 20, width: 800, height: 35, calloutNumber: 800 },
      { id: 'sidebar', label: 'Main\nNavigation\nMenu', x: 50, y: 75, width: 120, height: 475, calloutNumber: 802 },
      { id: 'production_tab', label: 'Production\nMode', x: 190, y: 75, width: 150, height: 35, calloutNumber: 804 },
      { id: 'ip_tab', label: 'IP Protection\nMode', x: 360, y: 75, width: 150, height: 35, calloutNumber: 806 },
      { id: 'series', label: 'Series/\nProject\nSelector', x: 190, y: 125, width: 200, height: 50, calloutNumber: 808 },
      { id: 'stats', label: 'Analytics Dashboard\n(Production Stats / Patent Status)', x: 410, y: 125, width: 440, height: 50, calloutNumber: 810 },
      { id: 'list_panel', label: 'Content List\n(Episodes /\nPatent Apps)', x: 190, y: 195, width: 200, height: 190, calloutNumber: 812 },
      { id: 'preview', label: 'Preview Area\n(Storyboard / Patent Spec)', x: 410, y: 195, width: 220, height: 190, calloutNumber: 814 },
      { id: 'details', label: 'Details Panel\n(Metadata /\nAnalysis)', x: 650, y: 195, width: 200, height: 190, calloutNumber: 816 },
      { id: 'actions', label: 'Action Button Bar', x: 190, y: 405, width: 660, height: 45, calloutNumber: 818 },
      { id: 'workflow', label: 'Workflow Progress Tracker', x: 190, y: 470, width: 320, height: 80, calloutNumber: 820 },
      { id: 'cost', label: 'Cost/Budget Summary', x: 530, y: 470, width: 320, height: 80, calloutNumber: 822 }
    ],
    arrows: []
  },
  {
    figureNumber: 9,
    title: 'IP Protection Suite Architecture',
    description: 'FIG. 9 is a block diagram illustrating the intellectual property protection suite and automated patent application workflow according to an embodiment of the present invention.',
    drawingType: 'block_diagram',
    width: 900,
    height: 700,
    blocks: [
      { id: 'ip_suite', label: 'IP Protection\nSuite', x: 375, y: 20, width: 150, height: 50, calloutNumber: 900 },
      { id: 'code_analysis', label: 'Codebase\nAnalysis\nModule', x: 50, y: 120, width: 140, height: 70, calloutNumber: 902 },
      { id: 'feature_extract', label: 'Feature\nExtraction\nEngine', x: 230, y: 120, width: 140, height: 70, calloutNumber: 904 },
      { id: 'novelty_score', label: 'Novelty\nScoring\nAlgorithm', x: 410, y: 120, width: 140, height: 70, calloutNumber: 906 },
      { id: 'prior_art', label: 'Prior Art\nSearch\nService', x: 590, y: 120, width: 140, height: 70, calloutNumber: 908 },
      { id: 'diff_analysis', label: 'Differentiation\nAnalysis', x: 770, y: 120, width: 120, height: 70, calloutNumber: 910 },
      { id: 'spec_gen', label: 'Specification\nGenerator', x: 100, y: 250, width: 140, height: 60, calloutNumber: 912 },
      { id: 'claims_gen', label: 'Claims\nGeneration\nModule', x: 280, y: 250, width: 140, height: 60, calloutNumber: 914 },
      { id: 'drawing_gen', label: 'Patent\nDrawing\nGenerator', x: 460, y: 250, width: 140, height: 60, calloutNumber: 916 },
      { id: 'alice_check', label: 'Alice Test\nRisk\nAnalyzer', x: 640, y: 250, width: 140, height: 60, calloutNumber: 918 },
      { id: 'abs_gen', label: 'Abstract\nGenerator', x: 100, y: 360, width: 140, height: 50, calloutNumber: 920 },
      { id: 'claim_dep', label: 'Dependent\nClaim\nBuilder', x: 280, y: 360, width: 140, height: 60, calloutNumber: 922 },
      { id: 'svg_render', label: 'SVG\nDiagram\nRenderer', x: 460, y: 360, width: 140, height: 60, calloutNumber: 924 },
      { id: 'ref_coord', label: 'Reference\nNumber\nCoordinator', x: 640, y: 360, width: 140, height: 60, calloutNumber: 926 },
      { id: 'form_gen', label: 'USPTO Form\nGenerator', x: 190, y: 480, width: 140, height: 60, calloutNumber: 928 },
      { id: 'ads_form', label: 'ADS Form\n(37 CFR 1.76)', x: 370, y: 480, width: 140, height: 50, calloutNumber: 930 },
      { id: 'sb16_form', label: 'SB/16\nCover Sheet', x: 550, y: 480, width: 140, height: 50, calloutNumber: 932 },
      { id: 'fee_calc', label: 'Filing Fee\nCalculator', x: 730, y: 480, width: 120, height: 50, calloutNumber: 934 },
      { id: 'validation', label: 'Application\nValidator', x: 280, y: 580, width: 140, height: 60, calloutNumber: 936 },
      { id: 'export', label: 'Export\nPackage\nAssembler', x: 460, y: 580, width: 140, height: 60, calloutNumber: 938 },
      { id: 'output', label: 'USPTO-Ready\nApplication\nPackage', x: 640, y: 580, width: 140, height: 60, calloutNumber: 940 }
    ],
    arrows: [
      { from: 'ip_suite', to: 'code_analysis' },
      { from: 'ip_suite', to: 'feature_extract' },
      { from: 'ip_suite', to: 'novelty_score' },
      { from: 'ip_suite', to: 'prior_art' },
      { from: 'code_analysis', to: 'feature_extract' },
      { from: 'feature_extract', to: 'novelty_score' },
      { from: 'prior_art', to: 'diff_analysis' },
      { from: 'novelty_score', to: 'diff_analysis' },
      { from: 'feature_extract', to: 'spec_gen' },
      { from: 'diff_analysis', to: 'spec_gen' },
      { from: 'novelty_score', to: 'claims_gen' },
      { from: 'diff_analysis', to: 'claims_gen' },
      { from: 'feature_extract', to: 'drawing_gen' },
      { from: 'claims_gen', to: 'alice_check' },
      { from: 'spec_gen', to: 'abs_gen' },
      { from: 'claims_gen', to: 'claim_dep' },
      { from: 'drawing_gen', to: 'svg_render' },
      { from: 'svg_render', to: 'ref_coord' },
      { from: 'ref_coord', to: 'spec_gen' },
      { from: 'abs_gen', to: 'form_gen' },
      { from: 'spec_gen', to: 'form_gen' },
      { from: 'form_gen', to: 'ads_form' },
      { from: 'form_gen', to: 'sb16_form' },
      { from: 'form_gen', to: 'fee_calc' },
      { from: 'ads_form', to: 'validation' },
      { from: 'sb16_form', to: 'validation' },
      { from: 'validation', to: 'export' },
      { from: 'export', to: 'output' }
    ]
  },
  {
    figureNumber: 10,
    title: 'Real-Time Analytics and Monitoring System',
    description: 'FIG. 10 is a block diagram illustrating the real-time analytics and production monitoring system according to an embodiment of the present invention.',
    drawingType: 'block_diagram',
    width: 850,
    height: 550,
    blocks: [
      { id: 'analytics', label: 'Analytics\nEngine', x: 350, y: 20, width: 150, height: 50, calloutNumber: 1000 },
      { id: 'prod_track', label: 'Production\nProgress\nTracker', x: 50, y: 120, width: 140, height: 70, calloutNumber: 1002 },
      { id: 'cost_track', label: 'Cost\nTracking\nModule', x: 230, y: 120, width: 140, height: 70, calloutNumber: 1004 },
      { id: 'quality_mon', label: 'Quality\nMonitoring', x: 410, y: 120, width: 140, height: 70, calloutNumber: 1006 },
      { id: 'perf_met', label: 'Performance\nMetrics\nCollector', x: 590, y: 120, width: 140, height: 70, calloutNumber: 1008 },
      { id: 'ep_prog', label: 'Episode\nProgress\nBreakdown', x: 50, y: 250, width: 140, height: 60, calloutNumber: 1010 },
      { id: 'ltv_calc', label: 'LTV\nCalculation\nEngine', x: 230, y: 250, width: 140, height: 60, calloutNumber: 1012 },
      { id: 'consist_check', label: 'Consistency\nScore\nTracker', x: 410, y: 250, width: 140, height: 60, calloutNumber: 1014 },
      { id: 'api_usage', label: 'API Usage\nMonitor', x: 590, y: 250, width: 140, height: 60, calloutNumber: 1016 },
      { id: 'dashboard', label: 'Dashboard\nVisualization', x: 190, y: 380, width: 160, height: 60, calloutNumber: 1018 },
      { id: 'alerts', label: 'Alert\nSystem', x: 410, y: 380, width: 140, height: 60, calloutNumber: 1020 },
      { id: 'reports', label: 'Report\nGenerator', x: 590, y: 380, width: 140, height: 60, calloutNumber: 1022 },
      { id: 'export_data', label: 'Data\nExport', x: 350, y: 480, width: 150, height: 50, calloutNumber: 1024 }
    ],
    arrows: [
      { from: 'analytics', to: 'prod_track' },
      { from: 'analytics', to: 'cost_track' },
      { from: 'analytics', to: 'quality_mon' },
      { from: 'analytics', to: 'perf_met' },
      { from: 'prod_track', to: 'ep_prog' },
      { from: 'cost_track', to: 'ltv_calc' },
      { from: 'quality_mon', to: 'consist_check' },
      { from: 'perf_met', to: 'api_usage' },
      { from: 'ep_prog', to: 'dashboard' },
      { from: 'ltv_calc', to: 'dashboard' },
      { from: 'consist_check', to: 'alerts' },
      { from: 'api_usage', to: 'alerts' },
      { from: 'api_usage', to: 'reports' },
      { from: 'dashboard', to: 'export_data' },
      { from: 'alerts', to: 'export_data' },
      { from: 'reports', to: 'export_data' }
    ]
  }
];

function generateBlockSVG(block: BlockElement): string {
  const lines = block.label.split('\n');
  const lineHeight = 16;
  const textY = block.y + (block.height / 2) - ((lines.length - 1) * lineHeight / 2);

  const textElements = lines.map((line, i) =>
    `<text x="${block.x + block.width / 2}" y="${textY + i * lineHeight}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="12">${line}</text>`
  ).join('');

  return `
    <rect x="${block.x}" y="${block.y}" width="${block.width}" height="${block.height}" fill="white" stroke="black" stroke-width="2" rx="4"/>
    ${textElements}
    <text x="${block.x + 8}" y="${block.y + 14}" font-family="Arial, sans-serif" font-size="10" font-weight="bold">${block.calloutNumber}</text>
  `;
}

function getBlockCenter(block: BlockElement): { x: number; y: number } {
  return {
    x: block.x + block.width / 2,
    y: block.y + block.height / 2
  };
}

function getConnectionPoints(from: BlockElement, to: BlockElement): { x1: number; y1: number; x2: number; y2: number } {
  const fromCenter = getBlockCenter(from);
  const toCenter = getBlockCenter(to);

  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  let x1: number, y1: number, x2: number, y2: number;

  if (Math.abs(dy) > Math.abs(dx)) {
    if (dy > 0) {
      x1 = fromCenter.x;
      y1 = from.y + from.height;
      x2 = toCenter.x;
      y2 = to.y;
    } else {
      x1 = fromCenter.x;
      y1 = from.y;
      x2 = toCenter.x;
      y2 = to.y + to.height;
    }
  } else {
    if (dx > 0) {
      x1 = from.x + from.width;
      y1 = fromCenter.y;
      x2 = to.x;
      y2 = toCenter.y;
    } else {
      x1 = from.x;
      y1 = fromCenter.y;
      x2 = to.x + to.width;
      y2 = toCenter.y;
    }
  }

  return { x1, y1, x2, y2 };
}

function generateArrowSVG(arrow: ArrowConnection, blocks: BlockElement[]): string {
  const fromBlock = blocks.find(b => b.id === arrow.from);
  const toBlock = blocks.find(b => b.id === arrow.to);

  if (!fromBlock || !toBlock) return '';

  const { x1, y1, x2, y2 } = getConnectionPoints(fromBlock, toBlock);

  const markerId = arrow.bidirectional ? 'arrow-bi' : 'arrow';

  let path = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="1.5" marker-end="url(#${markerId})"`;

  if (arrow.bidirectional) {
    path += ` marker-start="url(#arrow-start)"`;
  }

  path += '/>';

  return path;
}

function generateSVG(def: DiagramDefinition): string {
  const blocksSVG = def.blocks.map(generateBlockSVG).join('');
  const arrowsSVG = def.arrows.map(a => generateArrowSVG(a, def.blocks)).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${def.width} ${def.height}" width="${def.width}" height="${def.height}">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="black"/>
    </marker>
    <marker id="arrow-bi" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="black"/>
    </marker>
    <marker id="arrow-start" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M9,0 L9,6 L0,3 z" fill="black"/>
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="white"/>
  <text x="${def.width / 2}" y="${def.height - 10}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold">FIG. ${def.figureNumber}</text>
  ${arrowsSVG}
  ${blocksSVG}
</svg>`;
}

function extractCallouts(def: DiagramDefinition): DrawingCallout[] {
  return def.blocks.map(block => ({
    number: block.calloutNumber,
    label: block.label.replace(/\n/g, ' '),
    description: `Reference numeral ${block.calloutNumber} indicates ${block.label.replace(/\n/g, ' ').toLowerCase()}`
  }));
}

export function generateAllDrawings(): { svg: string; definition: DiagramDefinition; callouts: DrawingCallout[] }[] {
  return FIGURE_DEFINITIONS.map(def => ({
    svg: generateSVG(def),
    definition: def,
    callouts: extractCallouts(def)
  }));
}

export function generateDrawing(figureNumber: number): { svg: string; definition: DiagramDefinition; callouts: DrawingCallout[] } | null {
  const def = FIGURE_DEFINITIONS.find(d => d.figureNumber === figureNumber);
  if (!def) return null;

  return {
    svg: generateSVG(def),
    definition: def,
    callouts: extractCallouts(def)
  };
}

export async function generateDrawingsForApplication(
  applicationId: string,
  organizationId: string
): Promise<PatentDrawing[]> {
  const drawings: PatentDrawing[] = [];
  const errors: Array<{ figureNumber: string; error: string; details?: any }> = [];

  console.log(`Starting dynamic drawing generation for application ${applicationId}`);

  try {
    await deleteAllDrawingsForApplication(applicationId);
  } catch (error) {
    console.error('Failed to delete existing drawings:', error);
  }

  try {
    const featureAnalysis = await extractCodebaseFeatures(organizationId, 'both');
    const features = featureAnalysis.features;

    console.log(`Extracted ${features.length} features from codebase`);

    if (features.length === 0) {
      console.warn('No features found, using fallback static drawings');
      return await generateStaticDrawings(applicationId);
    }

    const domainAnalysis = analyzeDomain(features);
    console.log(`Domain analysis: ${domainAnalysis.domainType}, ${domainAnalysis.coreInnovationCount} core innovations`);

    const drawingSpecs = planDrawingFigures(features, domainAnalysis);
    console.log(`Planned ${drawingSpecs.length} figures for this application`);

    for (const spec of drawingSpecs) {
      await sleep(100);

      try {
        const figureNum = spec.subFigureLetter ? `${spec.figureNumber}${spec.subFigureLetter}` : spec.figureNumber.toString();
        console.log(`Generating Figure ${figureNum}: ${spec.title}`);

        const result = await generateDiagramForSpec(spec, features, domainAnalysis);

        if (!result.svg || result.svg.length === 0) {
          throw new Error(`SVG generation failed: empty SVG output`);
        }

        const drawing = await createPatentDrawing(applicationId, {
          figure_number: spec.figureNumber,
          title: spec.title,
          description: spec.description,
          svg_content: result.svg,
          image_url: null,
          drawing_type: spec.drawingType,
          callouts: result.callouts
        });

        drawings.push(drawing);
        console.log(`Successfully generated Figure ${figureNum}`);
      } catch (error) {
        const errorInfo = extractErrorInfo(error);
        const figureId = spec.subFigureLetter ? `${spec.figureNumber}${spec.subFigureLetter}` : spec.figureNumber.toString();

        console.error(`Failed to generate Figure ${figureId}:`, errorInfo);

        errors.push({
          figureNumber: figureId,
          error: errorInfo.message,
          details: errorInfo.details
        });

        await sleep(200);

        console.log(`Retrying Figure ${figureId}...`);
        try {
          const result = await generateDiagramForSpec(spec, features, domainAnalysis);
          const drawing = await createPatentDrawing(applicationId, {
            figure_number: spec.figureNumber,
            title: spec.title,
            description: spec.description,
            svg_content: result.svg,
            image_url: null,
            drawing_type: spec.drawingType,
            callouts: result.callouts
          });
          drawings.push(drawing);
          console.log(`Retry successful for Figure ${figureId}`);
        } catch (retryError) {
          console.error(`Retry failed for Figure ${figureId}:`, retryError);
        }
      }
    }

    console.log(`Drawing generation complete: ${drawings.length} successful, ${errors.length} failed`);

    if (drawings.length === 0) {
      const detailedErrors = errors.map(e => `Fig ${e.figureNumber}: ${e.error}`).join('; ');
      throw new Error(`All drawing generation attempts failed. Errors: ${detailedErrors}`);
    }

    if (errors.length > 0) {
      console.warn(`Some drawings failed to generate:`, errors);
    }

    return drawings;

  } catch (error) {
    console.error('Feature extraction or planning failed, falling back to static drawings:', error);
    return await generateStaticDrawings(applicationId);
  }
}

async function generateStaticDrawings(applicationId: string): Promise<PatentDrawing[]> {
  const drawings: PatentDrawing[] = [];

  console.log('Generating fallback static drawings');

  for (const def of FIGURE_DEFINITIONS) {
    try {
      const svg = generateSVG(def);
      const callouts = extractCallouts(def);

      const drawing = await createPatentDrawing(applicationId, {
        figure_number: def.figureNumber,
        title: def.title,
        description: def.description,
        svg_content: svg,
        image_url: null,
        drawing_type: def.drawingType,
        callouts
      });

      drawings.push(drawing);
    } catch (error) {
      console.error(`Failed to generate static Figure ${def.figureNumber}:`, error);
    }
  }

  return drawings;
}

async function generateDiagramForSpec(
  spec: DrawingSpec,
  features: ExtractedFeature[],
  domainAnalysis: any
): Promise<{ svg: string; callouts: DrawingCallout[] }> {
  const baseCalloutNumber = spec.figureNumber * 100;

  if (spec.figureNumber === 1) {
    const isOverview = spec.subFigureLetter === 'a';
    const arch = generateSystemArchitecture(
      features,
      spec.requiresSplit,
      isOverview,
      spec.subFigureLetter
    );
    return { svg: arch.svg, callouts: arch.callouts };
  }

  if (spec.drawingType === 'flowchart' && spec.sourceFeatures.length === 1) {
    return generateAlgorithmFlowchart(spec.sourceFeatures[0], spec.figureNumber, baseCalloutNumber);
  }

  if (spec.drawingType === 'block_diagram') {
    if (spec.title.includes('Data Structure')) {
      return generateDataStructureDiagram(spec.sourceFeatures, spec.figureNumber, baseCalloutNumber);
    }
    if (spec.title.includes('Integration')) {
      return generateIntegrationDiagram(spec.sourceFeatures, spec.figureNumber, baseCalloutNumber);
    }
    if (spec.sourceFeatures.length === 1 && spec.sourceFeatures[0].type === 'algorithm') {
      return generateAlgorithmFlowchart(spec.sourceFeatures[0], spec.figureNumber, baseCalloutNumber);
    }
  }

  if (spec.drawingType === 'wireframe') {
    return generateUIWireframe(spec.sourceFeatures, spec.figureNumber, baseCalloutNumber);
  }

  if (spec.title.includes('Workflow')) {
    return generateWorkflowDiagram(spec.sourceFeatures, spec.figureNumber, baseCalloutNumber);
  }

  return generateDataStructureDiagram(spec.sourceFeatures, spec.figureNumber, baseCalloutNumber);
}

function extractErrorInfo(error: any): { message: string; details: any } {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: (error as any).cause
      }
    };
  } else if (typeof error === 'object' && error !== null) {
    return {
      message: JSON.stringify(error),
      details: error
    };
  } else {
    return {
      message: String(error),
      details: { rawError: error, type: typeof error }
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getDrawingDefinitions(): DiagramDefinition[] {
  return FIGURE_DEFINITIONS;
}

export function svgToDataUrl(svg: string): string {
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml,${encoded}`;
}

export function formatDrawingsDescriptionSection(drawings: PatentDrawing[]): string {
  const sorted = [...drawings].sort((a, b) => a.figure_number - b.figure_number);

  let description = 'BRIEF DESCRIPTION OF THE DRAWINGS\n\n';
  description += 'The present invention will be more fully understood from the following detailed description taken in conjunction with the accompanying drawings, in which:\n\n';

  for (const drawing of sorted) {
    description += `${drawing.description}\n\n`;
  }

  return description;
}
