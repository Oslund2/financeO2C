import { generateText } from './geminiService';

export interface SpecificationSections {
  field: string;
  background: string;
  summary: string;
  detailedDescription: string;
  abstract: string;
}

export interface InventionContext {
  description?: string;
  technicalField?: string;
  problemSolved?: string;
}

export async function generateIntelligentSpecification(
  title: string,
  features: any[],
  priorArt: any[],
  differentiationReports: any[],
  inventionContext?: InventionContext
): Promise<SpecificationSections> {
  const field = await generateFieldSection(title, features, inventionContext);
  const background = await generateBackgroundSection(priorArt, differentiationReports, inventionContext);
  const summary = await generateSummarySection(features, differentiationReports, inventionContext);
  const detailedDescription = await generateDetailedDescriptionSection(features, inventionContext);
  const abstract = await generateAbstractSection(title, features, inventionContext);

  return {
    field,
    background,
    summary,
    detailedDescription,
    abstract
  };
}

async function generateFieldSection(
  title: string,
  features: any[],
  inventionContext?: InventionContext
): Promise<string> {
  const prompt = `Generate the content for a "Field of the Invention" section for a patent application.

Title: ${title}
${inventionContext?.technicalField ? `\nTechnical Field: ${inventionContext.technicalField}` : ''}
${inventionContext?.description ? `\nInvention Description:\n${inventionContext.description}` : ''}

Key Features:
${features.map(f => `- ${f.name || f.feature_name}: ${f.type || f.feature_type}`).join('\n')}

Write a concise 2-3 sentence field section that:
1. Identifies the technical field based on the invention description
2. Describes the general area of application
3. Uses proper patent language

Example format:
"The present invention relates generally to [field], and more particularly to [specific area]."

IMPORTANT:
- Base your response ONLY on the invention description and features provided above
- Do NOT include the section heading "Field of the Invention" or any similar heading
- Only provide the paragraph content itself`;

  const response = await generateText(prompt, 'patent_specification_field');
  return response.trim();
}

async function generateBackgroundSection(
  priorArt: any[],
  differentiationReports: any[],
  inventionContext?: InventionContext
): Promise<string> {
  const prompt = `Generate a COMPREHENSIVE "Background of the Invention" section for a patent application. Target 600-1000 words.
${inventionContext?.description ? `
INVENTION BEING PATENTED:
${inventionContext.description}
` : ''}
${inventionContext?.problemSolved ? `
PROBLEM THE INVENTION SOLVES:
${inventionContext.problemSolved}
` : ''}
PRIOR ART ANALYSIS:
${priorArt.length > 0 ? priorArt.map((pa, i) => `${i + 1}. ${pa.patent_number || 'Prior System'} - ${pa.patent_title || 'Existing Solution'}
   Limitations: ${pa.similarity_explanation || 'General limitations of existing approaches'}`).join('\n\n') : 'General prior art in the relevant technical field.'}

DIFFERENTIATION POINTS:
${differentiationReports.length > 0 ? differentiationReports.map(dr => `- Points of Novelty: ${dr.points_of_novelty?.join(', ') || 'Novel approach to the problem'}
- Technical Advantages: ${dr.technical_advantages?.join(', ') || 'Improved efficiency and accuracy'}`).join('\n') : 'Novel approaches that address limitations in existing systems.'}

Generate a COMPLETE background section with the following structure (5-8 paragraphs total):

**PARAGRAPH 1: Field Context**
- Introduce the broader technical field relevant to the invention described above
- Set the stage for the technical discussion

**PARAGRAPH 2-3: State of the Art**
- Describe current existing technologies and approaches in this field
- Explain how conventional systems work

**PARAGRAPH 4-5: Limitations of Prior Art**
- Detail specific technical limitations of existing solutions
- Relate these limitations to the problem the invention solves
- Use phrases like "However, these conventional systems suffer from..."

**PARAGRAPH 6-7: Technical Problems**
- Articulate the specific technical problems that the invention addresses
- Explain why these problems are significant

**PARAGRAPH 8: Need for the Invention**
- Summarize the need for a new solution
- Bridge to the present invention
- Use patent language like "Accordingly, there is a need for..."

REQUIREMENTS:
1. Base ALL content on the invention description provided above
2. DO NOT include section headings - write as continuous prose
3. Use professional patent language throughout
4. Focus on TECHNICAL problems, not business problems
5. Do NOT directly cite patent numbers - describe systems generically
6. Do NOT make up or hallucinate features not mentioned in the invention description

Begin directly with prose content.`;

  const response = await generateText(prompt, 'patent_specification_background');
  return response.trim();
}

async function generateSummarySection(
  features: any[],
  differentiationReports: any[],
  inventionContext?: InventionContext
): Promise<string> {
  const coreFeatures = features.filter(f => f.isCoreInnovation || f.is_core_innovation);
  const supportingFeatures = features.filter(f => !f.isCoreInnovation && !f.is_core_innovation);
  const advantages = differentiationReports
    .flatMap(dr => dr.technical_advantages || []);

  const prompt = `Generate a COMPREHENSIVE "Summary of the Invention" section for a patent application. Target 800-1500 words.
${inventionContext?.description ? `
INVENTION DESCRIPTION (PRIMARY SOURCE - USE THIS):
${inventionContext.description}
` : ''}
${inventionContext?.problemSolved ? `
PROBLEM SOLVED:
${inventionContext.problemSolved}
` : ''}
CORE INNOVATIONS (extracted from the invention):
${coreFeatures.length > 0 ? coreFeatures.map((f, i) => `${i + 1}. ${f.name || f.feature_name}
   Technical Details: ${f.technicalDetails || f.technical_description || f.description || 'Core component'}`).join('\n\n') : 'See invention description above.'}

SUPPORTING FEATURES:
${supportingFeatures.length > 0 ? supportingFeatures.map((f, i) => `${i + 1}. ${f.name || f.feature_name}: ${f.technicalDetails || f.technical_description || f.description || 'Supporting component'}`).join('\n') : 'Various supporting components.'}

TECHNICAL ADVANTAGES:
${advantages.length > 0 ? advantages.map((adv, i) => `${i + 1}. ${adv}`).join('\n') : '- As derived from the invention description above'}

Generate a COMPLETE summary section with ALL of the following (8-12 paragraphs total):

**PARAGRAPH 1: Invention Overview**
- Open with a clear statement of what the invention is based on the description above
- Use: "The present invention relates to..." or "The present invention provides..."

**PARAGRAPH 2-3: Objects of the Invention**
- State the primary objects/goals using patent language
- Base these on the problem the invention solves
- "It is an object of the present invention to provide..."

**PARAGRAPH 4-5: Technical Approach**
- Describe the primary technical methodology from the invention description
- Explain how the invention achieves its objects

**PARAGRAPH 6-7: Key Features and Components**
- List and describe each major innovative feature from the invention
- "In accordance with one aspect of the invention..."

**PARAGRAPH 8-9: Advantages and Benefits**
- Enumerate specific technical advantages
- "The present invention advantageously provides..."

**PARAGRAPH 10-11: System Integration**
- Describe how components work together
- "In a preferred embodiment..."

**PARAGRAPH 12: Scope Statement**
- "These and other features and advantages will become apparent..."

REQUIREMENTS:
1. Base ALL content ONLY on the invention description and features provided above
2. DO NOT make up or hallucinate features not mentioned in the input
3. DO NOT include section headings - write as continuous prose
4. Use formal patent language throughout
5. Be specific about features ACTUALLY described in the invention

Begin directly with prose content.`;

  const response = await generateText(prompt, 'patent_specification_summary');
  return response.trim();
}

async function generateDetailedDescriptionChunk(
  chunkType: 'overview' | 'components' | 'algorithms' | 'embodiments',
  features: any[],
  inventionContext?: InventionContext
): Promise<string> {
  const coreFeatures = features.filter(f => f.isCoreInnovation || f.is_core_innovation);

  const inventionHeader = inventionContext?.description ? `
INVENTION BEING DESCRIBED (USE THIS AS PRIMARY SOURCE):
${inventionContext.description}

` : '';

  const prompts: Record<string, string> = {
    overview: `Generate the SYSTEM OVERVIEW AND PREFERRED EMBODIMENT portion of a patent's Detailed Description section. Target 800-1200 words.
${inventionHeader}
INVENTION FEATURES:
${features.slice(0, 5).map((f, i) => `${i + 1}. ${f.name || f.feature_name}: ${f.technicalDetails || f.technical_description || f.description || 'System component'}`).join('\n')}

Generate 6-8 paragraphs covering:
1. Overall system purpose and high-level architecture based on the invention description
2. Primary technical approach and methodology
3. System components and their interconnections
4. Data flow through the system
5. Preferred embodiment configuration
6. Reference FIG. 1 for system architecture

REQUIREMENTS:
- Base ALL content on the invention description provided above
- Do NOT make up features not mentioned in the invention
- Use patent language: "In one embodiment...", "The present invention comprises..."
- DO NOT include any section headings. Write as continuous prose.`,

    components: `Generate the COMPONENT DETAILS portion of a patent's Detailed Description section. Target 1200-1800 words.
${inventionHeader}
COMPONENTS TO DESCRIBE IN DETAIL:
${features.map((f, i) => `${i + 1}. ${f.name || f.feature_name} (${f.type || f.feature_type || 'component'})
   Description: ${f.technicalDetails || f.technical_description || f.description || 'N/A'}
   Novelty: ${f.noveltyStrength || f.novelty_strength || 'standard'}`).join('\n\n')}

For EACH component from the invention, generate 2-3 paragraphs covering:
- Purpose and function within the system
- Technical implementation details
- Processing logic and transformations
- Reference appropriate figures

REQUIREMENTS:
- Base ALL content on the invention description and features provided above
- Do NOT make up features not mentioned in the invention
- Use patent language. DO NOT include section headings. Write as continuous prose.`,

    algorithms: `Generate the DATA PROCESSING AND ALGORITHMS portion of a patent's Detailed Description section. Target 800-1200 words.
${inventionHeader}
KEY ALGORITHMIC FEATURES:
${coreFeatures.map((f, i) => `${i + 1}. ${f.name || f.feature_name}
   Technical: ${f.technicalDetails || f.technical_description || f.description || 'Algorithm component'}`).join('\n\n')}

Generate 6-8 paragraphs covering:
1. Main processing algorithms with step-by-step logic from the invention
2. Data transformation methods
3. Processing flows
4. Optimization techniques mentioned in the invention
5. Example processing scenarios

REQUIREMENTS:
- Base ALL content on the invention description provided above
- Do NOT make up algorithms or features not mentioned in the invention
- Use patent language. DO NOT include section headings. Write as continuous prose.`,

    embodiments: `Generate the ALTERNATIVE EMBODIMENTS AND INTEGRATION portion of a patent's Detailed Description section. Target 600-1000 words.
${inventionHeader}
SYSTEM FEATURES FOR VARIATIONS:
${features.slice(0, 6).map((f, i) => `${i + 1}. ${f.name || f.feature_name}: ${f.technicalDetails || f.technical_description || f.description || 'Component'}`).join('\n')}

Generate 5-7 paragraphs covering:
1. Alternative implementations based on the invention
2. How components integrate and operate together
3. Complete operational workflow from initialization to output
4. Configuration options and customization points
5. Scope of the invention and equivalent variations

REQUIREMENTS:
- Base ALL content on the invention description provided above
- Do NOT make up features not mentioned in the invention
- Use phrases like "In an alternative embodiment...", "Those skilled in the art will appreciate..."
- DO NOT include section headings. Write as continuous prose.`
  };

  const response = await generateText(prompts[chunkType], 'patent_specification_detailed');
  return response.trim();
}

async function generateDetailedDescriptionSection(
  features: any[],
  inventionContext?: InventionContext
): Promise<string> {
  const chunks = await Promise.all([
    generateDetailedDescriptionChunk('overview', features, inventionContext),
    generateDetailedDescriptionChunk('components', features, inventionContext),
    generateDetailedDescriptionChunk('algorithms', features, inventionContext),
    generateDetailedDescriptionChunk('embodiments', features, inventionContext)
  ]);

  return chunks.join('\n\n');
}

async function generateAbstractSection(
  title: string,
  features: any[],
  inventionContext?: InventionContext
): Promise<string> {
  const coreFeatures = features.filter(f => f.isCoreInnovation || f.is_core_innovation).slice(0, 3);

  const prompt = `Generate an abstract for a patent application. USPTO limit is 150 words.

Title: ${title}
${inventionContext?.description ? `
INVENTION DESCRIPTION (BASE YOUR ABSTRACT ON THIS):
${inventionContext.description}
` : ''}
Core Features:
${coreFeatures.map(f => `- ${f.name || f.feature_name}: ${f.technicalDetails || f.technical_description || f.description}`).join('\n')}

Write a concise abstract (under 150 words) that:
1. Describes what the invention is based on the description above
2. Explains the technical approach mentioned in the invention
3. Lists the key novel features from the invention
4. Mentions primary advantages
5. Uses clear technical language

REQUIREMENTS:
- Base the abstract ONLY on the invention description provided above
- Do NOT make up features not mentioned in the invention description
- The abstract should be readable by non-experts but technically accurate.`;

  const response = await generateText(prompt, 'patent_abstract_generation');
  return response.trim().slice(0, 1000);
}

export async function regenerateSection(
  sectionName: string,
  currentContent: string,
  userFeedback: string,
  contextData: any
): Promise<string> {
  const prompt = `Regenerate the "${sectionName}" section of a patent application based on user feedback.

Current Content:
${currentContent}

User Feedback:
${userFeedback}

Context:
${JSON.stringify(contextData, null, 2)}

Rewrite this section incorporating the user's feedback while maintaining proper patent language and technical accuracy. Keep the same general structure but improve based on the feedback.`;

  const response = await generateText(prompt, 'patent_section_regeneration');
  return response.trim();
}
