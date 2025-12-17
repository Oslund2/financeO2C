import type { ExtractedFeature } from './patentFeatureExtractionService';
import type { DrawingCallout } from './patentApplicationService';
import {
  generateSVGDiagram,
  calculateOptimalLayout,
  extractCallouts,
  PRINT_CONSTANTS,
  type ComponentBlock,
  type Connection,
  type SVGDiagramConfig
} from './printOptimizedSVGGenerator';

interface ArchitectureDiagram {
  svg: string;
  callouts: DrawingCallout[];
  figureNumber: string;
  title: string;
  description: string;
}

export function generateSystemArchitecture(
  features: ExtractedFeature[],
  requiresSplit: boolean,
  isOverview: boolean = false,
  subFigure?: string
): ArchitectureDiagram {
  if (requiresSplit) {
    if (isOverview) {
      return generateOverviewArchitecture(features, subFigure || 'a');
    } else {
      return generateDetailedArchitecture(features, subFigure || 'b');
    }
  } else {
    return generateSingleArchitecture(features);
  }
}

function generateOverviewArchitecture(
  features: ExtractedFeature[],
  subFigure: string
): ArchitectureDiagram {
  const width = 1000;
  const height = 800;

  const subsystems = identifyMajorSubsystems(features);
  const blocks: ComponentBlock[] = [];
  const connections: Connection[] = [];

  let calloutNumber = 100;
  let yPos = PRINT_CONSTANTS.MARGIN + 80;
  const xStart = PRINT_CONSTANTS.MARGIN + 50;

  blocks.push({
    id: 'client',
    label: 'Client Application Layer',
    x: width / 2 - 150,
    y: yPos,
    width: 300,
    height: 60,
    calloutNumber: calloutNumber++,
    description: `Reference numeral ${calloutNumber - 1} indicates the client application layer providing user interface and interaction capabilities`
  });

  yPos += 100;

  const mainSubsystems: ComponentBlock[] = [];
  const subsPerRow = Math.min(3, subsystems.length);
  const blockWidth = 180;
  const spacing = 60;
  const totalWidth = subsPerRow * blockWidth + (subsPerRow - 1) * spacing;
  let xPos = (width - totalWidth) / 2;

  for (let i = 0; i < subsystems.length; i++) {
    if (i > 0 && i % subsPerRow === 0) {
      yPos += 120;
      xPos = (width - totalWidth) / 2;
    }

    const block: ComponentBlock = {
      id: subsystems[i].id,
      label: subsystems[i].name,
      x: xPos,
      y: yPos,
      width: blockWidth,
      height: 80,
      calloutNumber: calloutNumber++,
      description: `Reference numeral ${calloutNumber - 1} indicates the ${subsystems[i].name.toLowerCase()} ${subsystems[i].description}`
    };

    blocks.push(block);
    mainSubsystems.push(block);

    connections.push({
      from: 'client',
      to: subsystems[i].id
    });

    xPos += blockWidth + spacing;
  }

  yPos += 140;

  blocks.push({
    id: 'database',
    label: 'Multi-Tenant Database',
    x: width / 2 - 140,
    y: yPos,
    width: 280,
    height: 70,
    calloutNumber: calloutNumber++,
    description: `Reference numeral ${calloutNumber - 1} indicates the multi-tenant database with row-level security and organization isolation`
  });

  for (const subsystem of mainSubsystems) {
    connections.push({
      from: subsystem.id,
      to: 'database',
      bidirectional: true
    });
  }

  yPos += 110;

  blocks.push({
    id: 'ai_services',
    label: 'AI Model Services',
    x: width / 2 - 130,
    y: yPos,
    width: 260,
    height: 60,
    calloutNumber: calloutNumber++,
    description: `Reference numeral ${calloutNumber - 1} indicates the AI model services layer providing machine learning and generation capabilities`
  });

  for (const subsystem of mainSubsystems.slice(0, Math.min(3, mainSubsystems.length))) {
    connections.push({
      from: subsystem.id,
      to: 'ai_services'
    });
  }

  const config: SVGDiagramConfig = {
    width,
    height,
    blocks,
    connections,
    title: `FIG. 1${subFigure}`,
    figureNumber: `1${subFigure}`
  };

  return {
    svg: generateSVGDiagram(config),
    callouts: extractCallouts(blocks),
    figureNumber: `1${subFigure}`,
    title: 'High-Level System Architecture Overview',
    description: `FIG. 1${subFigure} is a block diagram illustrating the high-level system architecture overview showing major subsystems according to an embodiment of the present invention.`
  };
}

function generateDetailedArchitecture(
  features: ExtractedFeature[],
  subFigure: string
): ArchitectureDiagram {
  const width = 1200;
  const height = 900;

  const blocks: ComponentBlock[] = [];
  const connections: Connection[] = [];

  let calloutNumber = 200;

  const algorithms = features.filter(f => f.type === 'algorithm').slice(0, 4);
  const dataStructures = features.filter(f => f.type === 'data_structure').slice(0, 3);
  const integrations = features.filter(f => f.type === 'integration').slice(0, 4);

  let yPos = PRINT_CONSTANTS.MARGIN + 60;

  blocks.push({
    id: 'orchestrator',
    label: 'Workflow Orchestrator',
    x: width / 2 - 150,
    y: yPos,
    width: 300,
    height: 70,
    calloutNumber: calloutNumber++,
    description: `Reference numeral ${calloutNumber - 1} indicates the workflow orchestrator coordinating processing pipelines`
  });

  yPos += 110;

  const processingBlocks: ComponentBlock[] = [];
  let xPos = PRINT_CONSTANTS.MARGIN + 50;
  const blockWidth = 160;
  const spacing = 50;

  const maxPerRow = Math.floor((width - 2 * PRINT_CONSTANTS.MARGIN) / (blockWidth + spacing));
  let inRow = 0;

  for (const alg of algorithms) {
    if (inRow >= maxPerRow) {
      yPos += 100;
      xPos = PRINT_CONSTANTS.MARGIN + 50;
      inRow = 0;
    }

    const block: ComponentBlock = {
      id: `alg_${alg.name.replace(/\s+/g, '_')}`,
      label: alg.name.length > 25 ? alg.name.substring(0, 22) + '...' : alg.name,
      x: xPos,
      y: yPos,
      width: blockWidth,
      height: 70,
      calloutNumber: calloutNumber++,
      description: `Reference numeral ${calloutNumber - 1} indicates the ${alg.name.toLowerCase()} component`
    };

    blocks.push(block);
    processingBlocks.push(block);

    connections.push({
      from: 'orchestrator',
      to: block.id
    });

    xPos += blockWidth + spacing;
    inRow++;
  }

  yPos += 120;
  xPos = PRINT_CONSTANTS.MARGIN + 150;

  for (const ds of dataStructures) {
    const block: ComponentBlock = {
      id: `ds_${ds.name.replace(/\s+/g, '_')}`,
      label: ds.name.length > 25 ? ds.name.substring(0, 22) + '...' : ds.name,
      x: xPos,
      y: yPos,
      width: 180,
      height: 65,
      calloutNumber: calloutNumber++,
      description: `Reference numeral ${calloutNumber - 1} indicates the ${ds.name.toLowerCase()} data structure`
    };

    blocks.push(block);

    if (processingBlocks.length > 0) {
      connections.push({
        from: processingBlocks[0].id,
        to: block.id,
        bidirectional: true
      });
    }

    xPos += 250;
  }

  yPos += 110;
  xPos = PRINT_CONSTANTS.MARGIN + 100;
  inRow = 0;

  for (const integ of integrations) {
    if (inRow >= maxPerRow) {
      yPos += 90;
      xPos = PRINT_CONSTANTS.MARGIN + 100;
      inRow = 0;
    }

    const block: ComponentBlock = {
      id: `integ_${integ.name.replace(/\s+/g, '_')}`,
      label: integ.name.length > 25 ? integ.name.substring(0, 22) + '...' : integ.name,
      x: xPos,
      y: yPos,
      width: 170,
      height: 60,
      calloutNumber: calloutNumber++,
      description: `Reference numeral ${calloutNumber - 1} indicates the ${integ.name.toLowerCase()} integration layer`
    };

    blocks.push(block);

    if (processingBlocks.length > 0) {
      connections.push({
        from: processingBlocks[Math.min(1, processingBlocks.length - 1)].id,
        to: block.id
      });
    }

    xPos += 210;
    inRow++;
  }

  const config: SVGDiagramConfig = {
    width,
    height,
    blocks,
    connections,
    title: `FIG. 1${subFigure}`,
    figureNumber: `1${subFigure}`
  };

  return {
    svg: generateSVGDiagram(config),
    callouts: extractCallouts(blocks),
    figureNumber: `1${subFigure}`,
    title: 'Detailed Component Architecture',
    description: `FIG. 1${subFigure} is a block diagram illustrating the detailed component architecture with internal modules and processing engines according to an embodiment of the present invention.`
  };
}

function generateSingleArchitecture(features: ExtractedFeature[]): ArchitectureDiagram {
  const width = 1000;
  const height = 800;

  const blocks: ComponentBlock[] = [];
  const connections: Connection[] = [];

  let calloutNumber = 100;

  const coreComponents = [
    { id: 'frontend', name: 'Frontend Layer', desc: 'handling user interface and interactions' },
    { id: 'auth', name: 'Authentication', desc: 'managing user authentication and authorization' },
    { id: 'core', name: 'Core Processing', desc: 'coordinating main business logic' },
    { id: 'database', name: 'Database Layer', desc: 'providing data persistence and retrieval' }
  ];

  const layout = calculateOptimalLayout(
    coreComponents.length + Math.min(features.length, 8),
    width,
    height
  );

  let row = 0;
  let col = 0;

  for (const component of coreComponents) {
    const x = PRINT_CONSTANTS.MARGIN + col * (layout.blockWidth + layout.spacing);
    const y = PRINT_CONSTANTS.MARGIN + 60 + row * (layout.blockHeight + layout.spacing);

    blocks.push({
      id: component.id,
      label: component.name,
      x,
      y,
      width: layout.blockWidth,
      height: layout.blockHeight,
      calloutNumber: calloutNumber++,
      description: `Reference numeral ${calloutNumber - 1} indicates the ${component.name.toLowerCase()} ${component.desc}`
    });

    col++;
    if (col >= layout.cols) {
      col = 0;
      row++;
    }
  }

  connections.push({ from: 'frontend', to: 'auth' });
  connections.push({ from: 'frontend', to: 'core' });
  connections.push({ from: 'auth', to: 'database', bidirectional: true });
  connections.push({ from: 'core', to: 'database', bidirectional: true });

  const topFeatures = features.filter(f => f.isCoreInnovation).slice(0, 6);

  for (const feature of topFeatures) {
    const x = PRINT_CONSTANTS.MARGIN + col * (layout.blockWidth + layout.spacing);
    const y = PRINT_CONSTANTS.MARGIN + 60 + row * (layout.blockHeight + layout.spacing);

    const featureLabel = feature.name.length > 30 ? feature.name.substring(0, 27) + '...' : feature.name;

    blocks.push({
      id: `feature_${feature.name.replace(/\s+/g, '_')}`,
      label: featureLabel,
      x,
      y,
      width: layout.blockWidth,
      height: layout.blockHeight,
      calloutNumber: calloutNumber++,
      description: `Reference numeral ${calloutNumber - 1} indicates the ${feature.name.toLowerCase()} providing ${feature.description.toLowerCase()}`
    });

    connections.push({
      from: 'core',
      to: `feature_${feature.name.replace(/\s+/g, '_')}`
    });

    col++;
    if (col >= layout.cols) {
      col = 0;
      row++;
    }
  }

  const config: SVGDiagramConfig = {
    width,
    height,
    blocks,
    connections,
    title: 'FIG. 1',
    figureNumber: '1'
  };

  return {
    svg: generateSVGDiagram(config),
    callouts: extractCallouts(blocks),
    figureNumber: '1',
    title: 'Integrated System Architecture',
    description: 'FIG. 1 is a block diagram illustrating the integrated system architecture according to an embodiment of the present invention.'
  };
}

interface Subsystem {
  id: string;
  name: string;
  description: string;
  features: ExtractedFeature[];
}

function identifyMajorSubsystems(features: ExtractedFeature[]): Subsystem[] {
  const subsystems: Subsystem[] = [];

  const hasVideoFeatures = features.some(f =>
    f.name.toLowerCase().includes('video') ||
    f.name.toLowerCase().includes('script') ||
    f.name.toLowerCase().includes('character') ||
    f.name.toLowerCase().includes('cost')
  );

  const hasPatentFeatures = features.some(f =>
    f.name.toLowerCase().includes('patent') ||
    f.name.toLowerCase().includes('prior art') ||
    f.name.toLowerCase().includes('claims')
  );

  if (hasVideoFeatures) {
    subsystems.push({
      id: 'video_production',
      name: 'Video Production System',
      description: 'managing animation creation and processing workflows',
      features: features.filter(f =>
        f.name.toLowerCase().includes('video') ||
        f.name.toLowerCase().includes('script') ||
        f.name.toLowerCase().includes('character')
      )
    });

    subsystems.push({
      id: 'cost_tracking',
      name: 'Cost Analysis Engine',
      description: 'calculating and tracking production costs with decay modeling',
      features: features.filter(f => f.name.toLowerCase().includes('cost'))
    });
  }

  if (hasPatentFeatures) {
    subsystems.push({
      id: 'patent_workflow',
      name: 'Patent Workflow Manager',
      description: 'orchestrating patent application generation processes',
      features: features.filter(f => f.name.toLowerCase().includes('patent'))
    });

    subsystems.push({
      id: 'prior_art',
      name: 'Prior Art Analysis',
      description: 'searching and analyzing prior art patents',
      features: features.filter(f => f.name.toLowerCase().includes('prior art'))
    });
  }

  const promptFeatures = features.filter(f => f.name.toLowerCase().includes('prompt'));
  if (promptFeatures.length > 0) {
    subsystems.push({
      id: 'prompt_system',
      name: 'Prompt Library System',
      description: 'managing prompt templates and versioning',
      features: promptFeatures
    });
  }

  const authFeatures = features.filter(f =>
    f.name.toLowerCase().includes('organization') ||
    f.name.toLowerCase().includes('multi-tenant')
  );
  if (authFeatures.length > 0) {
    subsystems.push({
      id: 'multi_tenant',
      name: 'Multi-Tenant Architecture',
      description: 'providing organization isolation and access control',
      features: authFeatures
    });
  }

  return subsystems;
}
