import type { DrawingBlock } from './patentDrawingsService';

export interface ReferenceNumberMap {
  number: number;
  label: string;
  description: string;
  figureNumber: number;
}

export interface DrawingReferenceData {
  figureNumber: number;
  figureTitle: string;
  callouts: {
    number: number;
    label: string;
    description?: string;
  }[];
}

export function extractReferenceNumbersFromDrawings(
  drawings: Array<{
    figure_number: number;
    figure_title: string;
    svg_content?: string;
    blocks?: DrawingBlock[];
  }>
): ReferenceNumberMap[] {
  const referenceMap: ReferenceNumberMap[] = [];

  drawings.forEach(drawing => {
    if (!drawing.blocks || drawing.blocks.length === 0) {
      return;
    }

    drawing.blocks.forEach(block => {
      if (block.calloutNumber) {
        referenceMap.push({
          number: block.calloutNumber,
          label: block.label,
          description: block.description || `${block.label} component`,
          figureNumber: drawing.figure_number
        });
      }
    });
  });

  return referenceMap.sort((a, b) => a.number - b.number);
}

export function generateBriefDescriptionOfDrawings(
  drawings: Array<{
    figure_number: number;
    figure_title: string;
    svg_content?: string;
    blocks?: DrawingBlock[];
  }>
): string {
  if (!drawings || drawings.length === 0) {
    return '';
  }

  const lines: string[] = [];

  lines.push('BRIEF DESCRIPTION OF THE DRAWINGS');
  lines.push('');

  drawings.forEach(drawing => {
    const figNumber = drawing.figure_number;
    const figTitle = drawing.figure_title || `Figure ${figNumber}`;

    lines.push(`FIG. ${figNumber} is ${figTitle.toLowerCase()}.`);
  });

  lines.push('');

  return lines.join('\n');
}

export function generateDetailedDrawingDescription(
  drawings: Array<{
    figure_number: number;
    figure_title: string;
    svg_content?: string;
    blocks?: DrawingBlock[];
  }>
): string {
  if (!drawings || drawings.length === 0) {
    return '';
  }

  const referenceMap = extractReferenceNumbersFromDrawings(drawings);

  if (referenceMap.length === 0) {
    return '';
  }

  const lines: string[] = [];

  lines.push('DETAILED DESCRIPTION OF THE DRAWINGS');
  lines.push('');
  lines.push('The following reference numerals are used throughout the drawings:');
  lines.push('');

  const grouped = new Map<number, ReferenceNumberMap[]>();
  referenceMap.forEach(ref => {
    if (!grouped.has(ref.figureNumber)) {
      grouped.set(ref.figureNumber, []);
    }
    grouped.get(ref.figureNumber)!.push(ref);
  });

  Array.from(grouped.keys()).sort((a, b) => a - b).forEach(figNum => {
    const refs = grouped.get(figNum)!;
    lines.push(`Reference Numerals for FIG. ${figNum}:`);
    refs.forEach(ref => {
      lines.push(`  ${ref.number} - ${ref.label}`);
    });
    lines.push('');
  });

  return lines.join('\n');
}

export function generateReferenceNumberLegend(
  drawings: Array<{
    figure_number: number;
    figure_title: string;
    svg_content?: string;
    blocks?: DrawingBlock[];
  }>
): string {
  const referenceMap = extractReferenceNumbersFromDrawings(drawings);

  if (referenceMap.length === 0) {
    return 'No reference numbers available in drawings.';
  }

  const lines: string[] = [];
  lines.push('Reference Number Legend');
  lines.push('======================');
  lines.push('');

  const byFigure = new Map<number, ReferenceNumberMap[]>();
  referenceMap.forEach(ref => {
    if (!byFigure.has(ref.figureNumber)) {
      byFigure.set(ref.figureNumber, []);
    }
    byFigure.get(ref.figureNumber)!.push(ref);
  });

  Array.from(byFigure.keys()).sort((a, b) => a - b).forEach(figNum => {
    const refs = byFigure.get(figNum)!;
    const drawing = drawings.find(d => d.figure_number === figNum);

    lines.push(`Figure ${figNum}: ${drawing?.figure_title || 'Diagram'}`);
    lines.push('-'.repeat(50));

    refs.forEach(ref => {
      lines.push(`${String(ref.number).padStart(3, ' ')} - ${ref.label}`);
      if (ref.description && ref.description !== ref.label) {
        lines.push(`      ${ref.description}`);
      }
    });
    lines.push('');
  });

  return lines.join('\n');
}

export function buildReferenceNumberContext(
  drawings: Array<{
    figure_number: number;
    figure_title: string;
    svg_content?: string;
    blocks?: DrawingBlock[];
  }>
): string {
  const referenceMap = extractReferenceNumbersFromDrawings(drawings);

  if (referenceMap.length === 0) {
    return 'DO NOT use reference numerals. No drawings are available for this application.';
  }

  const lines: string[] = [];
  lines.push('USE THESE SPECIFIC REFERENCE NUMERALS (from the actual patent drawings):');
  lines.push('');

  const uniqueRefs = new Map<number, ReferenceNumberMap>();
  referenceMap.forEach(ref => {
    if (!uniqueRefs.has(ref.number)) {
      uniqueRefs.set(ref.number, ref);
    }
  });

  Array.from(uniqueRefs.values())
    .sort((a, b) => a.number - b.number)
    .forEach(ref => {
      lines.push(`${ref.number} = ${ref.label}`);
    });

  lines.push('');
  lines.push('When describing components, use these exact reference numerals from the drawings.');
  lines.push('For example: "The system 100 includes a processor 102 and database 104..."');
  lines.push('');
  lines.push('Available Figures:');

  const figureSet = new Set(referenceMap.map(r => r.figureNumber));
  Array.from(figureSet).sort((a, b) => a - b).forEach(figNum => {
    const drawing = drawings.find(d => d.figure_number === figNum);
    lines.push(`FIG. ${figNum} - ${drawing?.figure_title || 'Diagram'}`);
  });

  return lines.join('\n');
}

export function formatSpecificationWithDrawings(
  specification: {
    field: string;
    background: string;
    summary: string;
    detailedDescription: string;
    abstract: string;
  },
  drawings: Array<{
    figure_number: number;
    figure_title: string;
    svg_content?: string;
    blocks?: DrawingBlock[];
  }>
): string {
  const sections: string[] = [];

  if (specification.abstract) {
    sections.push('ABSTRACT');
    sections.push('');
    sections.push(specification.abstract);
    sections.push('');
    sections.push('');
  }

  if (specification.field) {
    sections.push('FIELD OF THE INVENTION');
    sections.push('');
    sections.push(specification.field);
    sections.push('');
    sections.push('');
  }

  if (specification.background) {
    sections.push('BACKGROUND OF THE INVENTION');
    sections.push('');
    sections.push(specification.background);
    sections.push('');
    sections.push('');
  }

  const briefDescription = generateBriefDescriptionOfDrawings(drawings);
  if (briefDescription) {
    sections.push(briefDescription);
    sections.push('');
  }

  if (specification.summary) {
    sections.push('SUMMARY OF THE INVENTION');
    sections.push('');
    sections.push(specification.summary);
    sections.push('');
    sections.push('');
  }

  if (specification.detailedDescription) {
    sections.push('DETAILED DESCRIPTION OF THE PREFERRED EMBODIMENT');
    sections.push('');
    sections.push(specification.detailedDescription);
    sections.push('');
    sections.push('');
  }

  return sections.join('\n');
}

export function validateReferenceNumbers(
  specificationText: string,
  drawings: Array<{
    figure_number: number;
    figure_title: string;
    svg_content?: string;
    blocks?: DrawingBlock[];
  }>
): {
  valid: boolean;
  unusedInSpec: number[];
  missingFromDrawings: number[];
  warnings: string[];
} {
  const referenceMap = extractReferenceNumbersFromDrawings(drawings);
  const drawingNumbers = new Set(referenceMap.map(r => r.number));

  const specNumberMatches = specificationText.match(/\b\d{3,}\b/g) || [];
  const specNumbers = new Set(
    specNumberMatches
      .map(n => parseInt(n, 10))
      .filter(n => n >= 100 && n < 1000)
  );

  const unusedInSpec = Array.from(drawingNumbers).filter(n => !specNumbers.has(n));
  const missingFromDrawings = Array.from(specNumbers).filter(n => !drawingNumbers.has(n));

  const warnings: string[] = [];

  if (missingFromDrawings.length > 0) {
    warnings.push(
      `Specification references numbers not found in drawings: ${missingFromDrawings.join(', ')}`
    );
  }

  if (unusedInSpec.length > 0 && unusedInSpec.length > drawingNumbers.size * 0.5) {
    warnings.push(
      `Many drawing reference numbers are not used in specification: ${unusedInSpec.join(', ')}`
    );
  }

  return {
    valid: missingFromDrawings.length === 0,
    unusedInSpec,
    missingFromDrawings,
    warnings
  };
}
