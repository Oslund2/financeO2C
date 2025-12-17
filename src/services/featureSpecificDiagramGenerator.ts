import type { ExtractedFeature } from './patentFeatureExtractionService';
import type { DrawingCallout } from './patentApplicationService';
import {
  generateSVGDiagram,
  generateFlowchartBlock,
  extractCallouts,
  PRINT_CONSTANTS,
  type ComponentBlock,
  type Connection,
  type SVGDiagramConfig
} from './printOptimizedSVGGenerator';

interface FeatureDiagram {
  svg: string;
  callouts: DrawingCallout[];
}

export function generateAlgorithmFlowchart(
  feature: ExtractedFeature,
  figureNumber: number,
  baseCalloutNumber: number = 100
): FeatureDiagram {
  const width = 900;
  const height = 800;

  const blocks: ComponentBlock[] = [];
  const connections: Connection[] = [];

  let calloutNumber = baseCalloutNumber;
  let yPos = PRINT_CONSTANTS.MARGIN + 60;
  const centerX = width / 2;

  const steps = extractAlgorithmSteps(feature);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const blockWidth = step.type === 'decision' ? 200 : 220;
    const blockHeight = step.type === 'decision' ? 100 : 70;

    blocks.push({
      id: `step_${i}`,
      label: step.label,
      x: centerX - blockWidth / 2,
      y: yPos,
      width: blockWidth,
      height: blockHeight,
      calloutNumber: calloutNumber++,
      description: `Reference numeral ${calloutNumber - 1} indicates the ${step.label.toLowerCase()} step`
    });

    if (i > 0) {
      connections.push({
        from: `step_${i - 1}`,
        to: `step_${i}`
      });
    }

    yPos += blockHeight + 50;
  }

  const flowchartBlocks = blocks.map(block => {
    const step = steps[blocks.indexOf(block)];
    const shape = step.type === 'start' || step.type === 'end' ? 'rounded' :
                  step.type === 'decision' ? 'diamond' : 'rectangle';
    return generateFlowchartBlock(block, shape);
  }).join('');

  const connectionsSVG = connections.map(c => generateConnectionSVG(c, blocks)).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="black"/>
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="white"/>
  ${connectionsSVG}
  ${flowchartBlocks}
  <text x="${width / 2}" y="${height - 15}" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold">FIG. ${figureNumber}</text>
</svg>`;

  return {
    svg,
    callouts: extractCallouts(blocks)
  };
}

export function generateDataStructureDiagram(
  features: ExtractedFeature[],
  figureNumber: number,
  baseCalloutNumber: number = 100
): FeatureDiagram {
  const width = 1000;
  const height = 700;

  const blocks: ComponentBlock[] = [];
  const connections: Connection[] = [];

  let calloutNumber = baseCalloutNumber;
  const structures = features.slice(0, 5);

  const cols = Math.min(3, structures.length);
  const rows = Math.ceil(structures.length / cols);
  const blockWidth = 200;
  const blockHeight = 120;
  const spacing = 80;

  const totalWidth = cols * blockWidth + (cols - 1) * spacing;
  const startX = (width - totalWidth) / 2;

  for (let i = 0; i < structures.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    const x = startX + col * (blockWidth + spacing);
    const y = PRINT_CONSTANTS.MARGIN + 100 + row * (blockHeight + spacing);

    blocks.push({
      id: `struct_${i}`,
      label: structures[i].name.length > 25 ? structures[i].name.substring(0, 22) + '...' : structures[i].name,
      x,
      y,
      width: blockWidth,
      height: blockHeight,
      calloutNumber: calloutNumber++,
      description: `Reference numeral ${calloutNumber - 1} indicates the ${structures[i].name.toLowerCase()} data structure managing ${structures[i].description.toLowerCase()}`
    });
  }

  for (let i = 1; i < blocks.length; i++) {
    if (i === 1 || i === 2) {
      connections.push({
        from: 'struct_0',
        to: `struct_${i}`,
        label: 'relates to',
        dashed: true
      });
    }
  }

  const config: SVGDiagramConfig = {
    width,
    height,
    blocks,
    connections,
    title: `FIG. ${figureNumber}`,
    figureNumber: figureNumber.toString()
  };

  return {
    svg: generateSVGDiagram(config),
    callouts: extractCallouts(blocks)
  };
}

export function generateIntegrationDiagram(
  features: ExtractedFeature[],
  figureNumber: number,
  baseCalloutNumber: number = 100
): FeatureDiagram {
  const width = 1000;
  const height = 700;

  const blocks: ComponentBlock[] = [];
  const connections: Connection[] = [];

  let calloutNumber = baseCalloutNumber;

  blocks.push({
    id: 'abstraction',
    label: 'Provider Abstraction Layer',
    x: width / 2 - 150,
    y: PRINT_CONSTANTS.MARGIN + 80,
    width: 300,
    height: 70,
    calloutNumber: calloutNumber++,
    description: `Reference numeral ${calloutNumber - 1} indicates the provider abstraction layer enabling multi-provider integration`
  });

  const integrations = features.slice(0, 4);
  const blockWidth = 180;
  const spacing = 50;
  const totalWidth = integrations.length * blockWidth + (integrations.length - 1) * spacing;
  let xPos = (width - totalWidth) / 2;
  const yPos = PRINT_CONSTANTS.MARGIN + 250;

  for (const integration of integrations) {
    const serviceLabel = extractServiceName(integration.name);

    blocks.push({
      id: `service_${integration.name.replace(/\s+/g, '_')}`,
      label: serviceLabel,
      x: xPos,
      y: yPos,
      width: blockWidth,
      height: 80,
      calloutNumber: calloutNumber++,
      description: `Reference numeral ${calloutNumber - 1} indicates the ${integration.name.toLowerCase()} external service integration`
    });

    connections.push({
      from: 'abstraction',
      to: `service_${integration.name.replace(/\s+/g, '_')}`
    });

    xPos += blockWidth + spacing;
  }

  blocks.push({
    id: 'response',
    label: 'Unified Response Handler',
    x: width / 2 - 140,
    y: yPos + 150,
    width: 280,
    height: 70,
    calloutNumber: calloutNumber++,
    description: `Reference numeral ${calloutNumber - 1} indicates the unified response handler processing results from all providers`
  });

  for (const integration of integrations) {
    connections.push({
      from: `service_${integration.name.replace(/\s+/g, '_')}`,
      to: 'response'
    });
  }

  const config: SVGDiagramConfig = {
    width,
    height,
    blocks,
    connections,
    title: `FIG. ${figureNumber}`,
    figureNumber: figureNumber.toString()
  };

  return {
    svg: generateSVGDiagram(config),
    callouts: extractCallouts(blocks)
  };
}

export function generateWorkflowDiagram(
  features: ExtractedFeature[],
  figureNumber: number,
  baseCalloutNumber: number = 100
): FeatureDiagram {
  const width = 800;
  const height = 900;

  const blocks: ComponentBlock[] = [];
  const connections: Connection[] = [];

  let calloutNumber = baseCalloutNumber;
  let yPos = PRINT_CONSTANTS.MARGIN + 60;
  const centerX = width / 2;

  const workflowSteps = [
    'Input Data Reception',
    'Data Validation',
    'Feature Extraction',
    'Processing Pipeline',
    'Quality Check',
    'Result Generation',
    'Output Delivery'
  ];

  for (let i = 0; i < workflowSteps.length; i++) {
    blocks.push({
      id: `workflow_${i}`,
      label: workflowSteps[i],
      x: centerX - 150,
      y: yPos,
      width: 300,
      height: 70,
      calloutNumber: calloutNumber++,
      description: `Reference numeral ${calloutNumber - 1} indicates the ${workflowSteps[i].toLowerCase()} stage of the workflow`
    });

    if (i > 0) {
      connections.push({
        from: `workflow_${i - 1}`,
        to: `workflow_${i}`
      });
    }

    yPos += 100;
  }

  const config: SVGDiagramConfig = {
    width,
    height,
    blocks,
    connections,
    title: `FIG. ${figureNumber}`,
    figureNumber: figureNumber.toString()
  };

  return {
    svg: generateSVGDiagram(config),
    callouts: extractCallouts(blocks)
  };
}

export function generateUIWireframe(
  features: ExtractedFeature[],
  figureNumber: number,
  baseCalloutNumber: number = 100
): FeatureDiagram {
  const width = 1100;
  const height = 700;

  const blocks: ComponentBlock[] = [];
  const connections: Connection[] = [];

  let calloutNumber = baseCalloutNumber;

  blocks.push({
    id: 'header',
    label: 'Navigation Header',
    x: PRINT_CONSTANTS.MARGIN,
    y: PRINT_CONSTANTS.MARGIN + 40,
    width: 1000,
    height: 60,
    calloutNumber: calloutNumber++,
    description: `Reference numeral ${calloutNumber - 1} indicates the navigation header with organization selector`
  });

  blocks.push({
    id: 'sidebar',
    label: 'Main Menu',
    x: PRINT_CONSTANTS.MARGIN,
    y: PRINT_CONSTANTS.MARGIN + 120,
    width: 180,
    height: 450,
    calloutNumber: calloutNumber++,
    description: `Reference numeral ${calloutNumber - 1} indicates the main menu navigation sidebar`
  });

  blocks.push({
    id: 'content',
    label: 'Content Area',
    x: PRINT_CONSTANTS.MARGIN + 200,
    y: PRINT_CONSTANTS.MARGIN + 120,
    width: 500,
    height: 450,
    calloutNumber: calloutNumber++,
    description: `Reference numeral ${calloutNumber - 1} indicates the main content display area`
  });

  blocks.push({
    id: 'details',
    label: 'Details Panel',
    x: PRINT_CONSTANTS.MARGIN + 720,
    y: PRINT_CONSTANTS.MARGIN + 120,
    width: 280,
    height: 450,
    calloutNumber: calloutNumber++,
    description: `Reference numeral ${calloutNumber - 1} indicates the details and metadata panel`
  });

  const config: SVGDiagramConfig = {
    width,
    height,
    blocks,
    connections: [],
    title: `FIG. ${figureNumber}`,
    figureNumber: figureNumber.toString()
  };

  return {
    svg: generateSVGDiagram(config),
    callouts: extractCallouts(blocks)
  };
}

function extractAlgorithmSteps(feature: ExtractedFeature): Array<{type: string; label: string}> {
  const steps: Array<{type: string; label: string}> = [
    { type: 'start', label: 'Start' }
  ];

  if (feature.name.includes('Cost')) {
    steps.push(
      { type: 'process', label: 'Receive Episode Parameters' },
      { type: 'process', label: 'Calculate Base Costs' },
      { type: 'decision', label: 'Episode > 1?' },
      { type: 'process', label: 'Apply Decay Factor' },
      { type: 'process', label: 'Sum Total Cost' },
      { type: 'process', label: 'Generate Report' }
    );
  } else if (feature.name.includes('Prompt')) {
    steps.push(
      { type: 'process', label: 'Receive Prompt Request' },
      { type: 'decision', label: 'In Cache?' },
      { type: 'process', label: 'Query Database' },
      { type: 'process', label: 'Resolve Variables' },
      { type: 'process', label: 'Return Prompt' }
    );
  } else if (feature.name.includes('Script')) {
    steps.push(
      { type: 'process', label: 'Load Script Content' },
      { type: 'process', label: 'Parse Structure' },
      { type: 'process', label: 'Extract Dialogue' },
      { type: 'process', label: 'Generate Shot List' },
      { type: 'process', label: 'Store Results' }
    );
  } else {
    steps.push(
      { type: 'process', label: 'Initialize Process' },
      { type: 'process', label: 'Perform Analysis' },
      { type: 'decision', label: 'Valid?' },
      { type: 'process', label: 'Generate Output' }
    );
  }

  steps.push({ type: 'end', label: 'End' });

  return steps;
}

function extractServiceName(featureName: string): string {
  if (featureName.includes('ElevenLabs')) return 'ElevenLabs API';
  if (featureName.includes('Chatterbox')) return 'Chatterbox API';
  if (featureName.includes('Lip Sync')) return 'Lip Sync Provider';
  if (featureName.includes('Gemini')) return 'Gemini AI';
  if (featureName.includes('Video')) return 'Video Service';

  const words = featureName.split(' ');
  return words.slice(0, 3).join(' ');
}

function generateConnectionSVG(connection: Connection, blocks: ComponentBlock[]): string {
  const fromBlock = blocks.find(b => b.id === connection.from);
  const toBlock = blocks.find(b => b.id === connection.to);

  if (!fromBlock || !toBlock) return '';

  const x1 = fromBlock.x + fromBlock.width / 2;
  const y1 = fromBlock.y + fromBlock.height;
  const x2 = toBlock.x + toBlock.width / 2;
  const y2 = toBlock.y;

  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="2" marker-end="url(#arrow)"/>`;
}
