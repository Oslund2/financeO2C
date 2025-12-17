import type { DrawingCallout } from './patentApplicationService';

export const PRINT_CONSTANTS = {
  MIN_FONT_SIZE: 14,
  LABEL_FONT_SIZE: 16,
  CALLOUT_FONT_SIZE: 12,
  TITLE_FONT_SIZE: 18,
  MIN_STROKE_WIDTH: 2,
  MIN_SPACING: 30,
  MIN_COMPONENT_WIDTH: 120,
  MIN_COMPONENT_HEIGHT: 50,
  CALLOUT_CIRCLE_SIZE: 24,
  ARROW_HEAD_SIZE: 12,
  MARGIN: 50,
  LINE_HEIGHT: 20,
  MAX_LABEL_LENGTH: 20
};

export interface ComponentBlock {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  calloutNumber: number;
  description?: string;
}

export interface Connection {
  from: string;
  to: string;
  label?: string;
  bidirectional?: boolean;
  dashed?: boolean;
}

export interface SVGDiagramConfig {
  width: number;
  height: number;
  blocks: ComponentBlock[];
  connections: Connection[];
  title: string;
  figureNumber: string;
}

export function wrapText(text: string, maxLength: number = PRINT_CONSTANTS.MAX_LABEL_LENGTH): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxLength) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

export function generateBlockSVG(block: ComponentBlock): string {
  const lines = wrapText(block.label);
  const lineHeight = PRINT_CONSTANTS.LINE_HEIGHT;
  const textStartY = block.y + (block.height / 2) - ((lines.length - 1) * lineHeight / 2);

  const textElements = lines.map((line, i) =>
    `<text x="${block.x + block.width / 2}" y="${textStartY + i * lineHeight}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${PRINT_CONSTANTS.LABEL_FONT_SIZE}" font-weight="500">${escapeXml(line)}</text>`
  ).join('');

  return `
    <rect x="${block.x}" y="${block.y}" width="${block.width}" height="${block.height}"
          fill="white" stroke="black" stroke-width="${PRINT_CONSTANTS.MIN_STROKE_WIDTH}" rx="6"/>
    ${textElements}
    <circle cx="${block.x + 12}" cy="${block.y + 12}" r="${PRINT_CONSTANTS.CALLOUT_CIRCLE_SIZE / 2}"
            fill="white" stroke="black" stroke-width="${PRINT_CONSTANTS.MIN_STROKE_WIDTH}"/>
    <text x="${block.x + 12}" y="${block.y + 12}" text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, sans-serif" font-size="${PRINT_CONSTANTS.CALLOUT_FONT_SIZE}" font-weight="bold">${block.calloutNumber}</text>
  `;
}

export function getBlockCenter(block: ComponentBlock): { x: number; y: number } {
  return {
    x: block.x + block.width / 2,
    y: block.y + block.height / 2
  };
}

export function getConnectionPoints(
  from: ComponentBlock,
  to: ComponentBlock
): { x1: number; y1: number; x2: number; y2: number } {
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

export function generateConnectionSVG(
  connection: Connection,
  blocks: ComponentBlock[]
): string {
  const fromBlock = blocks.find(b => b.id === connection.from);
  const toBlock = blocks.find(b => b.id === connection.to);

  if (!fromBlock || !toBlock) return '';

  const { x1, y1, x2, y2 } = getConnectionPoints(fromBlock, toBlock);

  const markerId = connection.bidirectional ? 'arrow-bi' : 'arrow';
  const strokeDasharray = connection.dashed ? '8,4' : 'none';

  let path = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
                    stroke="black" stroke-width="${PRINT_CONSTANTS.MIN_STROKE_WIDTH}"
                    stroke-dasharray="${strokeDasharray}"
                    marker-end="url(#${markerId})"`;

  if (connection.bidirectional) {
    path += ` marker-start="url(#arrow-start)"`;
  }

  path += '/>';

  if (connection.label) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    path += `
      <rect x="${midX - 30}" y="${midY - 10}" width="60" height="20" fill="white" stroke="none"/>
      <text x="${midX}" y="${midY}" text-anchor="middle" dominant-baseline="middle"
            font-family="Arial, sans-serif" font-size="${PRINT_CONSTANTS.MIN_FONT_SIZE}"
            font-style="italic">${escapeXml(connection.label)}</text>
    `;
  }

  return path;
}

export function generateSVGDiagram(config: SVGDiagramConfig): string {
  const blocksSVG = config.blocks.map(generateBlockSVG).join('');
  const connectionsSVG = config.connections.map(c => generateConnectionSVG(c, config.blocks)).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${config.width} ${config.height}" width="${config.width}" height="${config.height}">
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
  ${connectionsSVG}
  ${blocksSVG}
  <text x="${config.width / 2}" y="${config.height - 15}" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="${PRINT_CONSTANTS.TITLE_FONT_SIZE}"
        font-weight="bold">${escapeXml(config.title)}</text>
</svg>`;
}

export function generateFlowchartBlock(
  block: ComponentBlock,
  shape: 'rectangle' | 'diamond' | 'rounded' = 'rectangle'
): string {
  const lines = wrapText(block.label);
  const lineHeight = PRINT_CONSTANTS.LINE_HEIGHT;
  const textStartY = block.y + (block.height / 2) - ((lines.length - 1) * lineHeight / 2);

  const textElements = lines.map((line, i) =>
    `<text x="${block.x + block.width / 2}" y="${textStartY + i * lineHeight}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${PRINT_CONSTANTS.LABEL_FONT_SIZE}">${escapeXml(line)}</text>`
  ).join('');

  let shapeElement: string;

  if (shape === 'diamond') {
    const cx = block.x + block.width / 2;
    const cy = block.y + block.height / 2;
    const points = `${cx},${block.y} ${block.x + block.width},${cy} ${cx},${block.y + block.height} ${block.x},${cy}`;
    shapeElement = `<polygon points="${points}" fill="white" stroke="black" stroke-width="${PRINT_CONSTANTS.MIN_STROKE_WIDTH}"/>`;
  } else if (shape === 'rounded') {
    shapeElement = `<rect x="${block.x}" y="${block.y}" width="${block.width}" height="${block.height}" fill="white" stroke="black" stroke-width="${PRINT_CONSTANTS.MIN_STROKE_WIDTH}" rx="25"/>`;
  } else {
    shapeElement = `<rect x="${block.x}" y="${block.y}" width="${block.width}" height="${block.height}" fill="white" stroke="black" stroke-width="${PRINT_CONSTANTS.MIN_STROKE_WIDTH}"/>`;
  }

  return `
    ${shapeElement}
    ${textElements}
    <circle cx="${block.x + 12}" cy="${block.y + 12}" r="${PRINT_CONSTANTS.CALLOUT_CIRCLE_SIZE / 2}" fill="white" stroke="black" stroke-width="${PRINT_CONSTANTS.MIN_STROKE_WIDTH}"/>
    <text x="${block.x + 12}" y="${block.y + 12}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${PRINT_CONSTANTS.CALLOUT_FONT_SIZE}" font-weight="bold">${block.calloutNumber}</text>
  `;
}

export function extractCallouts(blocks: ComponentBlock[]): DrawingCallout[] {
  return blocks.map(block => ({
    number: block.calloutNumber,
    label: block.label.replace(/\n/g, ' '),
    description: block.description || `Reference numeral ${block.calloutNumber} indicates ${block.label.replace(/\n/g, ' ').toLowerCase()}`
  }));
}

export function calculateOptimalLayout(
  componentCount: number,
  canvasWidth: number,
  canvasHeight: number
): { cols: number; rows: number; blockWidth: number; blockHeight: number; spacing: number } {
  const cols = Math.ceil(Math.sqrt(componentCount));
  const rows = Math.ceil(componentCount / cols);

  const availableWidth = canvasWidth - (2 * PRINT_CONSTANTS.MARGIN);
  const availableHeight = canvasHeight - (2 * PRINT_CONSTANTS.MARGIN) - 50;

  const spacing = PRINT_CONSTANTS.MIN_SPACING;
  const blockWidth = Math.max(
    PRINT_CONSTANTS.MIN_COMPONENT_WIDTH,
    Math.floor((availableWidth - (cols - 1) * spacing) / cols)
  );
  const blockHeight = Math.max(
    PRINT_CONSTANTS.MIN_COMPONENT_HEIGHT,
    Math.floor((availableHeight - (rows - 1) * spacing) / rows)
  );

  return { cols, rows, blockWidth, blockHeight, spacing };
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
