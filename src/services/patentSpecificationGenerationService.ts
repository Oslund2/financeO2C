import { generateText } from './geminiService';
import {
  getPatentFieldOfInventionPrompt,
  getPatentBackgroundPrompt,
  getPatentSummaryPrompt,
  getPatentDetailedDescriptionPrompt,
  getPatentAbstractPrompt,
  getPatentSectionRegenerationPrompt
} from './promptResolver';
import {
  buildReferenceNumberContext,
  generateBriefDescriptionOfDrawings,
  extractReferenceNumbersFromDrawings,
  validateReferenceNumbers,
  injectFigureReferences
} from './referenceNumberCoordinator';
import type { DrawingBlock } from './patentDrawingsService';

export interface ReferenceValidationResult {
  valid: boolean;
  orphanedReferences: number[];
  unusedDrawingReferences: number[];
  warnings: string[];
}

export interface SpecificationWithValidation {
  sections: SpecificationSections;
  validation: ReferenceValidationResult;
  cleanedSections?: SpecificationSections;
}

export interface SpecificationSections {
  field: string;
  background: string;
  briefDescriptionOfDrawings: string;
  summary: string;
  detailedDescription: string;
  abstract: string;
}

export interface InventionContext {
  description?: string;
  technicalField?: string;
  problemSolved?: string;
}

export interface PatentDrawingData {
  figure_number: number;
  figure_title: string;
  svg_content?: string;
  blocks?: DrawingBlock[];
}

export async function generateIntelligentSpecification(
  title: string,
  features: any[],
  priorArt: any[],
  differentiationReports: any[],
  inventionContext?: InventionContext,
  organizationId?: string | null,
  drawings?: PatentDrawingData[]
): Promise<SpecificationSections> {
  const orgId = organizationId || null;

  const referenceContext = drawings && drawings.length > 0
    ? buildReferenceNumberContext(drawings)
    : null;

  const briefDescriptionOfDrawings = drawings && drawings.length > 0
    ? generateBriefDescriptionOfDrawings(drawings)
    : '';

  const field = await generateFieldSection(title, features, inventionContext, orgId, referenceContext);
  const background = await generateBackgroundSection(priorArt, differentiationReports, inventionContext, orgId, referenceContext);
  const summary = await generateSummarySection(title, features, differentiationReports, inventionContext, orgId, referenceContext);
  const detailedDescription = await generateDetailedDescriptionSection(title, features, inventionContext, orgId, referenceContext, drawings);
  const abstract = await generateAbstractSection(title, features, inventionContext, orgId);

  return {
    field,
    background,
    briefDescriptionOfDrawings,
    summary,
    detailedDescription,
    abstract
  };
}

async function generateFieldSection(
  title: string,
  features: any[],
  inventionContext?: InventionContext,
  organizationId?: string | null,
  referenceContext?: string | null
): Promise<string> {
  const featuresText = features
    .map(f => `• ${f.name || f.feature_name}: ${f.type || f.feature_type}`)
    .join('\n');

  try {
    let promptVars = {
      title,
      technicalField: inventionContext?.technicalField || '',
      inventionDescription: inventionContext?.description || '',
      features: featuresText
    };

    if (referenceContext) {
      promptVars = {
        ...promptVars,
        inventionDescription: `${promptVars.inventionDescription}\n\n${referenceContext}`
      } as any;
    }

    const prompt = await getPatentFieldOfInventionPrompt(organizationId || null, promptVars);

    const response = await generateText(prompt, 'patent_specification_field');
    return response.trim();
  } catch (error) {
    console.error('Field section generation failed:', error);
    return 'The present invention relates generally to computer-implemented systems and methods for automated content production.';
  }
}

async function generateBackgroundSection(
  priorArt: any[],
  differentiationReports: any[],
  inventionContext?: InventionContext,
  organizationId?: string | null,
  referenceContext?: string | null
): Promise<string> {
  const priorArtText = priorArt.length > 0
    ? priorArt.map((pa, i) => `${i + 1}. ${pa.patent_number || 'Prior System'} - ${pa.patent_title || 'Existing Solution'}
   Limitations: ${pa.similarity_explanation || 'General limitations of existing approaches'}`).join('\n\n')
    : 'General prior art in the relevant technical field.';

  const differentiationText = differentiationReports.length > 0
    ? differentiationReports.map(dr => `- Points of Novelty: ${dr.points_of_novelty?.join(', ') || 'Novel approach to the problem'}
- Technical Advantages: ${dr.technical_advantages?.join(', ') || 'Improved efficiency and accuracy'}`).join('\n')
    : 'Novel approaches that address limitations in existing systems.';

  try {
    let promptVars = {
      inventionDescription: inventionContext?.description || '',
      problemSolved: inventionContext?.problemSolved || '',
      priorArt: priorArtText,
      differentiationPoints: differentiationText
    };

    if (referenceContext) {
      promptVars.inventionDescription = `${promptVars.inventionDescription}\n\n${referenceContext}`;
    }

    const prompt = await getPatentBackgroundPrompt(organizationId || null, promptVars);

    const response = await generateText(prompt, 'patent_specification_background');
    return response.trim();
  } catch (error) {
    console.error('Background section generation failed:', error);
    return 'The field of automated content production has seen significant advances in recent years. However, existing systems suffer from various limitations that the present invention addresses.';
  }
}

async function generateSummarySection(
  title: string,
  features: any[],
  differentiationReports: any[],
  inventionContext?: InventionContext,
  organizationId?: string | null,
  referenceContext?: string | null
): Promise<string> {
  const coreFeatures = features.filter(f => f.isCoreInnovation || f.is_core_innovation);
  const advantages = differentiationReports.flatMap(dr => dr.technical_advantages || []);

  const featuresText = coreFeatures.length > 0
    ? coreFeatures.map(f => `• ${f.name || f.feature_name}
   Technical Details: ${f.technicalDetails || f.technical_description || f.description || 'Core component'}`).join('\n\n')
    : features.slice(0, 5).map(f => `• ${f.name || f.feature_name}: ${f.technicalDetails || f.technical_description || f.description || 'Component'}`).join('\n');

  const differentiationText = advantages.length > 0
    ? advantages.map((adv, i) => `${i + 1}. ${adv}`).join('\n')
    : 'Improved efficiency and streamlined workflow';

  try {
    let promptVars = {
      title,
      features: featuresText,
      differentiationPoints: differentiationText,
      inventionDescription: inventionContext?.description || '',
      problemSolved: inventionContext?.problemSolved || ''
    };

    if (referenceContext) {
      promptVars.inventionDescription = `${promptVars.inventionDescription}\n\n${referenceContext}`;
    }

    const prompt = await getPatentSummaryPrompt(organizationId || null, promptVars);

    const response = await generateText(prompt, 'patent_specification_summary');
    return response.trim();
  } catch (error) {
    console.error('Summary section generation failed:', error);
    return 'The present invention provides a system and method for automated content production with improved efficiency and quality.';
  }
}

async function generateDetailedDescriptionChunk(
  chunkType: 'overview' | 'components' | 'algorithms' | 'embodiments',
  title: string,
  features: any[],
  inventionContext?: InventionContext,
  organizationId?: string | null
): Promise<string> {
  const coreFeatures = features.filter(f => f.isCoreInnovation || f.is_core_innovation);

  const featuresText = chunkType === 'algorithms'
    ? coreFeatures.map(f => `• ${f.name || f.feature_name}
   Technical: ${f.technicalDetails || f.technical_description || f.description || 'Algorithm component'}`).join('\n\n')
    : chunkType === 'components'
    ? features.map(f => `• ${f.name || f.feature_name} (${f.type || f.feature_type || 'component'})
   Description: ${f.technicalDetails || f.technical_description || f.description || 'N/A'}
   Novelty: ${f.noveltyStrength || f.novelty_strength || 'standard'}`).join('\n\n')
    : features.slice(0, 6).map(f => `• ${f.name || f.feature_name}: ${f.technicalDetails || f.technical_description || f.description || 'System component'}`).join('\n');

  try {
    let promptVars = {
      sectionType: chunkType,
      title,
      features: featuresText,
      inventionDescription: inventionContext?.description || '',
      technicalField: inventionContext?.technicalField || ''
    };

    const prompt = await getPatentDetailedDescriptionPrompt(organizationId || null, promptVars);

    const response = await generateText(prompt, 'patent_specification_detailed');
    return response.trim();
  } catch (error) {
    console.error(`Detailed description chunk (${chunkType}) generation failed:`, error);
    return '';
  }
}

async function generateDetailedDescriptionSection(
  title: string,
  features: any[],
  inventionContext?: InventionContext,
  organizationId?: string | null,
  referenceContext?: string | null,
  drawings?: PatentDrawingData[]
): Promise<string> {
  const sections: string[] = [];

  if (drawings && drawings.length > 0) {
    const refs = extractReferenceNumbersFromDrawings(drawings);
    if (refs.length > 0) {
      sections.push('Referring now to the drawings, wherein like reference numerals designate corresponding parts throughout the several views:');
      sections.push('');
    }
  }

  const inventionContextWithRefs = referenceContext
    ? {
        ...inventionContext,
        description: `${inventionContext?.description || ''}\n\n${referenceContext}`
      }
    : inventionContext;

  const chunks = await Promise.all([
    generateDetailedDescriptionChunk('overview', title, features, inventionContextWithRefs, organizationId),
    generateDetailedDescriptionChunk('components', title, features, inventionContextWithRefs, organizationId),
    generateDetailedDescriptionChunk('algorithms', title, features, inventionContextWithRefs, organizationId),
    generateDetailedDescriptionChunk('embodiments', title, features, inventionContextWithRefs, organizationId)
  ]);

  sections.push(...chunks.filter(c => c.length > 0));

  return sections.join('\n\n');
}

async function generateAbstractSection(
  title: string,
  features: any[],
  inventionContext?: InventionContext,
  organizationId?: string | null
): Promise<string> {
  const coreFeatures = features.filter(f => f.isCoreInnovation || f.is_core_innovation).slice(0, 3);

  const featuresText = coreFeatures.length > 0
    ? coreFeatures.map(f => `- ${f.name || f.feature_name}: ${f.technicalDetails || f.technical_description || f.description}`).join('\n')
    : features.slice(0, 3).map(f => `- ${f.name || f.feature_name}: ${f.technicalDetails || f.technical_description || f.description || 'Component'}`).join('\n');

  try {
    const prompt = await getPatentAbstractPrompt(organizationId || null, {
      title,
      features: featuresText,
      inventionDescription: inventionContext?.description || ''
    });

    const response = await generateText(prompt, 'patent_abstract_generation');
    return response.trim().slice(0, 1000);
  } catch (error) {
    console.error('Abstract section generation failed:', error);
    return `A system and method for ${title.toLowerCase()} is disclosed. The system provides automated processing capabilities with improved efficiency.`;
  }
}

export async function regenerateSection(
  sectionName: string,
  currentContent: string,
  userFeedback: string,
  contextData: any,
  organizationId?: string | null
): Promise<string> {
  try {
    const prompt = await getPatentSectionRegenerationPrompt(organizationId || null, {
      sectionType: sectionName,
      currentContent,
      instructions: userFeedback,
      context: JSON.stringify(contextData, null, 2),
      inventionDescription: contextData?.inventionDescription || ''
    });

    const response = await generateText(prompt, 'patent_section_regeneration');
    return response.trim();
  } catch (error) {
    console.error('Section regeneration failed:', error);
    return currentContent;
  }
}

export function cleanOrphanedReferences(
  text: string,
  validReferenceNumbers: Set<number>
): string {
  const referencePattern = /(\b(?:module|system|platform|engine|component|unit|processor|database|interface|layer|manager|algorithm|service|handler|controller|generator|analyzer|tracker|pipeline|workflow|suite|model|storage|cache)\s+)(\d{3})(\b)/gi;

  return text.replace(referencePattern, (match, prefix, numStr, suffix) => {
    const num = parseInt(numStr, 10);
    if (validReferenceNumbers.has(num)) {
      return match;
    }
    return prefix.trim() + suffix;
  });
}

export function validateSpecificationReferences(
  sections: SpecificationSections,
  drawings: PatentDrawingData[]
): ReferenceValidationResult {
  const fullText = [
    sections.field,
    sections.background,
    sections.summary,
    sections.detailedDescription,
    sections.abstract
  ].join('\n\n');

  const validationResult = validateReferenceNumbers(fullText, drawings);

  return {
    valid: validationResult.valid,
    orphanedReferences: validationResult.missingFromDrawings,
    unusedDrawingReferences: validationResult.unusedInSpec,
    warnings: validationResult.warnings
  };
}

export function cleanSpecificationSections(
  sections: SpecificationSections,
  drawings: PatentDrawingData[]
): SpecificationSections {
  const refs = extractReferenceNumbersFromDrawings(drawings);
  const validNumbers = new Set(refs.map(r => r.number));

  return {
    field: cleanOrphanedReferences(sections.field, validNumbers),
    background: cleanOrphanedReferences(sections.background, validNumbers),
    briefDescriptionOfDrawings: sections.briefDescriptionOfDrawings,
    summary: cleanOrphanedReferences(sections.summary, validNumbers),
    detailedDescription: cleanOrphanedReferences(sections.detailedDescription, validNumbers),
    abstract: cleanOrphanedReferences(sections.abstract, validNumbers)
  };
}

function applyFigureReferencesToSections(
  sections: SpecificationSections,
  drawings: PatentDrawingData[]
): SpecificationSections {
  if (!drawings || drawings.length === 0) {
    return sections;
  }

  return {
    field: injectFigureReferences(sections.field, drawings),
    background: injectFigureReferences(sections.background, drawings),
    briefDescriptionOfDrawings: sections.briefDescriptionOfDrawings,
    summary: injectFigureReferences(sections.summary, drawings),
    detailedDescription: injectFigureReferences(sections.detailedDescription, drawings),
    abstract: injectFigureReferences(sections.abstract, drawings)
  };
}

export async function generateValidatedSpecification(
  title: string,
  features: any[],
  priorArt: any[],
  differentiationReports: any[],
  inventionContext?: InventionContext,
  organizationId?: string | null,
  drawings?: PatentDrawingData[],
  autoClean: boolean = true
): Promise<SpecificationWithValidation> {
  const sections = await generateIntelligentSpecification(
    title,
    features,
    priorArt,
    differentiationReports,
    inventionContext,
    organizationId,
    drawings
  );

  const drawingsArray = drawings || [];
  const validation = validateSpecificationReferences(sections, drawingsArray);

  let cleanedSections: SpecificationSections | undefined;
  if (autoClean && !validation.valid && drawingsArray.length > 0) {
    cleanedSections = cleanSpecificationSections(sections, drawingsArray);
  }

  let finalSections = autoClean && cleanedSections ? cleanedSections : sections;

  if (drawingsArray.length > 0) {
    finalSections = applyFigureReferencesToSections(finalSections, drawingsArray);
    if (cleanedSections) {
      cleanedSections = applyFigureReferencesToSections(cleanedSections, drawingsArray);
    }
  }

  return {
    sections: finalSections,
    validation,
    cleanedSections
  };
}
