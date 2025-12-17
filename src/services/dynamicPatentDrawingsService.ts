import type { ExtractedFeature } from './patentFeatureExtractionService';
import type { PatentDrawing, DrawingCallout } from './patentApplicationService';

export interface DrawingSpec {
  figureNumber: number;
  title: string;
  description: string;
  drawingType: PatentDrawing['drawing_type'];
  sourceFeatures: ExtractedFeature[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
  requiresSplit: boolean;
  subFigureLetter?: string;
}

export interface DomainAnalysis {
  domainType: 'video_production_only' | 'patent_management_only' | 'integrated_platform';
  videoProductionFeatures: ExtractedFeature[];
  patentManagementFeatures: ExtractedFeature[];
  topTierFeatures: ExtractedFeature[];
  moderateFeatures: ExtractedFeature[];
  totalFeatureCount: number;
  coreInnovationCount: number;
}

export function analyzeDomain(features: ExtractedFeature[]): DomainAnalysis {
  const videoFeatures = features.filter(f =>
    f.sourceFile?.includes('cost') ||
    f.sourceFile?.includes('prompt') ||
    f.sourceFile?.includes('consistency') ||
    f.sourceFile?.includes('episode') ||
    f.sourceFile?.includes('dialogue') ||
    f.sourceFile?.includes('lipSync') ||
    f.sourceFile?.includes('translation') ||
    f.sourceFile?.includes('batch') ||
    f.sourceFile?.includes('gemini') ||
    f.name.toLowerCase().includes('video') ||
    f.name.toLowerCase().includes('animation') ||
    f.name.toLowerCase().includes('character') ||
    f.name.toLowerCase().includes('script')
  );

  const patentFeatures = features.filter(f =>
    f.sourceFile?.includes('patent') ||
    f.name.toLowerCase().includes('patent') ||
    f.name.toLowerCase().includes('prior art') ||
    f.name.toLowerCase().includes('novelty') ||
    f.name.toLowerCase().includes('claims')
  );

  const videoPercentage = features.length > 0 ? (videoFeatures.length / features.length) * 100 : 0;

  let domainType: DomainAnalysis['domainType'];
  if (videoPercentage >= 80) {
    domainType = 'video_production_only';
  } else if (videoPercentage <= 20) {
    domainType = 'patent_management_only';
  } else {
    domainType = 'integrated_platform';
  }

  const topTierFeatures = features.filter(f =>
    f.noveltyStrength === 'strong' && f.isCoreInnovation
  );

  const moderateFeatures = features.filter(f =>
    f.noveltyStrength === 'moderate' ||
    (f.noveltyStrength === 'strong' && !f.isCoreInnovation)
  );

  const coreCount = features.filter(f => f.isCoreInnovation).length;

  return {
    domainType,
    videoProductionFeatures: videoFeatures,
    patentManagementFeatures: patentFeatures,
    topTierFeatures,
    moderateFeatures,
    totalFeatureCount: features.length,
    coreInnovationCount: coreCount
  };
}

export function planDrawingFigures(
  features: ExtractedFeature[],
  analysis: DomainAnalysis
): DrawingSpec[] {
  const specs: DrawingSpec[] = [];
  let figureNumber = 1;

  const systemComponents = estimateSystemComponents(features);
  const needsSplit = systemComponents > 15;

  if (needsSplit) {
    specs.push({
      figureNumber: 1,
      subFigureLetter: 'a',
      title: 'High-Level System Architecture Overview',
      description: `FIG. 1a is a block diagram illustrating the high-level system architecture overview showing major subsystems of the ${getDomainDescription(analysis.domainType)} according to an embodiment of the present invention.`,
      drawingType: 'block_diagram',
      sourceFeatures: features,
      estimatedComplexity: 'moderate',
      requiresSplit: true
    });

    specs.push({
      figureNumber: 1,
      subFigureLetter: 'b',
      title: 'Detailed Component Architecture',
      description: `FIG. 1b is a block diagram illustrating the detailed component architecture with internal modules and processing engines of the ${getDomainDescription(analysis.domainType)} according to an embodiment of the present invention.`,
      drawingType: 'block_diagram',
      sourceFeatures: features,
      estimatedComplexity: 'complex',
      requiresSplit: true
    });
    figureNumber = 2;
  } else {
    specs.push({
      figureNumber: 1,
      title: 'Integrated System Architecture',
      description: `FIG. 1 is a block diagram illustrating the integrated system architecture of the ${getDomainDescription(analysis.domainType)} according to an embodiment of the present invention.`,
      drawingType: 'block_diagram',
      sourceFeatures: features,
      estimatedComplexity: systemComponents > 10 ? 'moderate' : 'simple',
      requiresSplit: false
    });
    figureNumber = 2;
  }

  for (const feature of analysis.topTierFeatures) {
    const spec = createFeatureDrawingSpec(feature, figureNumber, analysis.domainType);
    if (spec) {
      specs.push(spec);
      figureNumber++;
    }
  }

  const algorithmFeatures = analysis.moderateFeatures.filter(f => f.type === 'algorithm');
  if (algorithmFeatures.length > 0) {
    for (const feature of algorithmFeatures.slice(0, 2)) {
      const spec = createFeatureDrawingSpec(feature, figureNumber, analysis.domainType);
      if (spec) {
        specs.push(spec);
        figureNumber++;
      }
    }
  }

  const integrationFeatures = analysis.moderateFeatures.filter(f => f.type === 'integration');
  if (integrationFeatures.length >= 3) {
    specs.push({
      figureNumber,
      title: 'Multi-Provider Integration Architecture',
      description: `FIG. ${figureNumber} is a block diagram illustrating the multi-provider integration architecture with abstraction layers and service orchestration according to an embodiment of the present invention.`,
      drawingType: 'block_diagram',
      sourceFeatures: integrationFeatures,
      estimatedComplexity: 'moderate',
      requiresSplit: false
    });
    figureNumber++;
  }

  const dataStructures = features.filter(f => f.type === 'data_structure');
  if (dataStructures.length >= 2) {
    specs.push({
      figureNumber,
      title: 'Data Structure Relationships',
      description: `FIG. ${figureNumber} is an entity-relationship diagram illustrating the data structure relationships and multi-tenant isolation architecture according to an embodiment of the present invention.`,
      drawingType: 'block_diagram',
      sourceFeatures: dataStructures,
      estimatedComplexity: 'moderate',
      requiresSplit: false
    });
    figureNumber++;
  }

  if (analysis.domainType === 'video_production_only' || analysis.domainType === 'integrated_platform') {
    const workflowFeatures = features.filter(f =>
      f.name.toLowerCase().includes('workflow') ||
      f.name.toLowerCase().includes('pipeline') ||
      f.name.toLowerCase().includes('script-to')
    );

    if (workflowFeatures.length > 0) {
      specs.push({
        figureNumber,
        title: 'Production Workflow Process',
        description: `FIG. ${figureNumber} is a flowchart illustrating the production workflow process from input to final output according to an embodiment of the present invention.`,
        drawingType: 'flowchart',
        sourceFeatures: workflowFeatures,
        estimatedComplexity: 'moderate',
        requiresSplit: false
      });
      figureNumber++;
    }
  }

  const uiFeatures = features.filter(f => f.type === 'ui_pattern');
  if (uiFeatures.length >= 2) {
    specs.push({
      figureNumber,
      title: 'User Interface Architecture',
      description: `FIG. ${figureNumber} is a wireframe illustration of the user interface architecture showing main navigation and workflow management components according to an embodiment of the present invention.`,
      drawingType: 'wireframe',
      sourceFeatures: uiFeatures,
      estimatedComplexity: 'simple',
      requiresSplit: false
    });
    figureNumber++;
  }

  return specs;
}

function createFeatureDrawingSpec(
  feature: ExtractedFeature,
  figureNumber: number,
  domainType: DomainAnalysis['domainType']
): DrawingSpec | null {
  const drawingType = getDrawingTypeForFeature(feature);

  return {
    figureNumber,
    title: feature.name,
    description: `FIG. ${figureNumber} is a ${getDrawingTypeDescription(drawingType)} illustrating the ${feature.name.toLowerCase()} according to an embodiment of the present invention.`,
    drawingType,
    sourceFeatures: [feature],
    estimatedComplexity: feature.noveltyStrength === 'strong' ? 'moderate' : 'simple',
    requiresSplit: false
  };
}

function getDrawingTypeForFeature(feature: ExtractedFeature): PatentDrawing['drawing_type'] {
  if (feature.type === 'algorithm') {
    return 'flowchart';
  } else if (feature.type === 'data_structure') {
    return 'block_diagram';
  } else if (feature.type === 'integration') {
    return 'block_diagram';
  } else if (feature.type === 'ui_pattern') {
    return 'wireframe';
  } else {
    return 'block_diagram';
  }
}

function getDrawingTypeDescription(type: PatentDrawing['drawing_type']): string {
  switch (type) {
    case 'flowchart':
      return 'flowchart';
    case 'block_diagram':
      return 'block diagram';
    case 'wireframe':
      return 'wireframe diagram';
    case 'schematic':
      return 'schematic diagram';
    case 'sequence_diagram':
      return 'sequence diagram';
    default:
      return 'diagram';
  }
}

function estimateSystemComponents(features: ExtractedFeature[]): number {
  const coreComponents = 5;
  const featureComponents = Math.ceil(features.length * 0.6);
  const integrationPoints = features.filter(f => f.type === 'integration').length * 2;

  return coreComponents + featureComponents + integrationPoints;
}

function getDomainDescription(domainType: DomainAnalysis['domainType']): string {
  switch (domainType) {
    case 'video_production_only':
      return 'AI-powered video production system';
    case 'patent_management_only':
      return 'automated patent management and analysis system';
    case 'integrated_platform':
      return 'integrated video production and patent management platform';
  }
}
