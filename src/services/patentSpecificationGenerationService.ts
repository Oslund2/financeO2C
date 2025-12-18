import { generateText } from './geminiService';

export interface SpecificationSections {
  field: string;
  background: string;
  summary: string;
  detailedDescription: string;
  abstract: string;
}

export async function generateIntelligentSpecification(
  title: string,
  features: any[],
  priorArt: any[],
  differentiationReports: any[]
): Promise<SpecificationSections> {
  const field = await generateFieldSection(title, features);
  const background = await generateBackgroundSection(priorArt, differentiationReports);
  const summary = await generateSummarySection(features, differentiationReports);
  const detailedDescription = await generateDetailedDescriptionSection(features);
  const abstract = await generateAbstractSection(title, features);

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
  features: any[]
): Promise<string> {
  const prompt = `Generate the content for a "Field of the Invention" section for a patent application.

Title: ${title}

Key Features:
${features.map(f => `- ${f.feature_name}: ${f.feature_type}`).join('\n')}

Write a concise 2-3 sentence field section that:
1. Identifies the technical field
2. Describes the general area of application
3. Uses proper patent language

Example format:
"The present invention relates generally to [field], and more particularly to [specific area]."

IMPORTANT: Do NOT include the section heading "Field of the Invention" or any similar heading in your output. Only provide the paragraph content itself.`;

  const response = await generateText(prompt, 'patent_specification_field');
  return response.trim();
}

async function generateBackgroundSection(
  priorArt: any[],
  differentiationReports: any[]
): Promise<string> {
  const prompt = `Generate a COMPREHENSIVE "Background of the Invention" section for a patent application. Target 600-1000 words.

PRIOR ART ANALYSIS:
${priorArt.length > 0 ? priorArt.map((pa, i) => `${i + 1}. ${pa.patent_number || 'Prior System'} - ${pa.patent_title || 'Existing Solution'}
   Limitations: ${pa.similarity_explanation || 'General limitations of existing approaches'}`).join('\n\n') : 'General prior art in the field of digital content creation and AI-assisted production systems.'}

DIFFERENTIATION POINTS:
${differentiationReports.length > 0 ? differentiationReports.map(dr => `- Points of Novelty: ${dr.points_of_novelty?.join(', ') || 'Novel approach to the problem'}
- Technical Advantages: ${dr.technical_advantages?.join(', ') || 'Improved efficiency and accuracy'}`).join('\n') : 'Novel approaches that address limitations in existing systems.'}

Generate a COMPLETE background section with the following structure (5-8 paragraphs total):

**PARAGRAPH 1: Field Context**
- Introduce the broader technical field
- Describe the general industry/application area
- Set the stage for the technical discussion

**PARAGRAPH 2-3: State of the Art**
- Describe current existing technologies and approaches
- Explain how conventional systems work
- Identify the general methods used in the field

**PARAGRAPH 4-5: Limitations of Prior Art**
- Detail specific technical limitations of existing solutions
- Explain what current systems cannot achieve
- Describe inefficiencies, errors, or gaps in current approaches
- Use phrases like "However, these conventional systems suffer from..."

**PARAGRAPH 6-7: Technical Problems**
- Articulate the specific technical problems that remain unsolved
- Explain why these problems are significant
- Describe failed attempts or partial solutions

**PARAGRAPH 8: Need for the Invention**
- Summarize the need for a new solution
- Bridge to the present invention
- Use patent language like "Accordingly, there is a need for..."

REQUIREMENTS:
1. DO NOT include section headings - write as continuous prose
2. Use professional patent language throughout
3. Focus on TECHNICAL problems, not business problems
4. Do NOT directly cite patent numbers - describe systems generically
5. Create a clear narrative leading to the need for this invention
6. Be specific about technical limitations and gaps

Begin directly with prose content.`;

  const response = await generateText(prompt, 'patent_specification_background');
  return response.trim();
}

async function generateSummarySection(
  features: any[],
  differentiationReports: any[]
): Promise<string> {
  const coreFeatures = features.filter(f => f.is_core_innovation);
  const supportingFeatures = features.filter(f => !f.is_core_innovation);
  const advantages = differentiationReports
    .flatMap(dr => dr.technical_advantages || []);

  const prompt = `Generate a COMPREHENSIVE "Summary of the Invention" section for a patent application. Target 800-1500 words.

CORE INNOVATIONS:
${coreFeatures.length > 0 ? coreFeatures.map((f, i) => `${i + 1}. ${f.feature_name}
   Technical Details: ${f.technical_description || 'Core system component'}`).join('\n\n') : 'Innovative system for automated content production.'}

SUPPORTING FEATURES:
${supportingFeatures.length > 0 ? supportingFeatures.map((f, i) => `${i + 1}. ${f.feature_name}: ${f.technical_description || 'Supporting component'}`).join('\n') : 'Various supporting components for the system.'}

TECHNICAL ADVANTAGES:
${advantages.length > 0 ? advantages.map((adv, i) => `${i + 1}. ${adv}`).join('\n') : '- Improved efficiency\n- Enhanced accuracy\n- Reduced manual effort\n- Scalable architecture'}

Generate a COMPLETE summary section with ALL of the following (8-12 paragraphs total):

**PARAGRAPH 1: Invention Overview**
- Open with a clear statement of what the invention is
- Use: "The present invention relates to..." or "The present invention provides..."

**PARAGRAPH 2-3: Objects of the Invention**
- State the primary objects/goals using patent language
- "It is an object of the present invention to provide..."
- "It is another object of the invention to..."
- "It is a further object of the invention to..."
- List at least 4-5 distinct objects

**PARAGRAPH 4-5: Technical Approach**
- Describe the primary technical methodology
- Explain the key architectural decisions
- Describe how the invention achieves its objects

**PARAGRAPH 6-7: Key Features and Components**
- List and describe each major innovative feature
- Explain what makes each feature novel
- "In accordance with one aspect of the invention..."
- "According to another aspect of the invention..."

**PARAGRAPH 8-9: Advantages and Benefits**
- Enumerate specific technical advantages
- Explain improvements over prior art
- "The present invention advantageously provides..."
- Include at least 5-6 specific advantages

**PARAGRAPH 10-11: System Integration**
- Describe how all components work together
- Explain the synergistic effects of the combined system
- "In a preferred embodiment..."

**PARAGRAPH 12: Scope Statement**
- Conclude with a statement about the scope
- "These and other features and advantages will become apparent..."

REQUIREMENTS:
1. DO NOT include section headings - write as continuous prose
2. Use formal patent language throughout
3. Include multiple "object of the invention" statements
4. Be specific about technical features and advantages
5. Cover ALL provided features, not just a subset
6. Emphasize novelty and technical improvement

Begin directly with prose content.`;

  const response = await generateText(prompt, 'patent_specification_summary');
  return response.trim();
}

async function generateDetailedDescriptionChunk(
  chunkType: 'overview' | 'components' | 'algorithms' | 'embodiments',
  features: any[],
  chunkIndex: number = 0
): Promise<string> {
  const coreFeatures = features.filter(f => f.is_core_innovation);
  const supportingFeatures = features.filter(f => !f.is_core_innovation);

  const prompts: Record<string, string> = {
    overview: `Generate the SYSTEM OVERVIEW AND PREFERRED EMBODIMENT portion of a patent's Detailed Description section. Target 800-1200 words.

INVENTION FEATURES:
${features.slice(0, 5).map((f, i) => `${i + 1}. ${f.feature_name}: ${f.technical_description || 'System component'}`).join('\n')}

Generate 6-8 paragraphs covering:
1. Overall system purpose and high-level architecture
2. Primary technical approach and methodology
3. System components and their interconnections
4. Data flow through the system
5. Preferred embodiment configuration
6. Hardware/software requirements
7. Reference FIG. 1 for system architecture

Use patent language: "In one embodiment...", "The present invention comprises...", "As illustrated in FIG. 1..."
DO NOT include any section headings. Write as continuous prose.`,

    components: `Generate the COMPONENT DETAILS portion of a patent's Detailed Description section. Target 1200-1800 words.

COMPONENTS TO DESCRIBE IN DETAIL:
${features.map((f, i) => `${i + 1}. ${f.feature_name} (${f.feature_type || 'component'})
   Description: ${f.technical_description || 'N/A'}
   Novelty: ${f.novelty_strength || 'standard'}
   ${f.code_snippet ? `Implementation: ${f.code_snippet.slice(0, 200)}...` : ''}`).join('\n\n')}

For EACH component, generate 2-3 paragraphs covering:
- Purpose and function within the system
- Technical implementation details
- Input specifications (data types, formats, ranges)
- Processing logic and transformations
- Output specifications
- Error handling approaches
- Reference appropriate figures (FIG. 2, FIG. 3, etc.)

Use patent language. DO NOT include section headings. Write as continuous prose.`,

    algorithms: `Generate the DATA PROCESSING AND ALGORITHMS portion of a patent's Detailed Description section. Target 800-1200 words.

KEY ALGORITHMIC FEATURES:
${coreFeatures.map((f, i) => `${i + 1}. ${f.feature_name}
   Technical: ${f.technical_description || 'Algorithm component'}
   ${f.code_snippet ? `Code: ${f.code_snippet.slice(0, 300)}` : ''}`).join('\n\n')}

Generate 6-8 paragraphs covering:
1. Main processing algorithms with step-by-step logic
2. Data transformation methods
3. Calculation formulas with example values
4. Decision trees and branching logic
5. Optimization techniques
6. Performance considerations
7. Example processing scenarios with specific values

Include pseudocode-like descriptions where appropriate.
Use patent language. DO NOT include section headings. Write as continuous prose.`,

    embodiments: `Generate the ALTERNATIVE EMBODIMENTS AND INTEGRATION portion of a patent's Detailed Description section. Target 600-1000 words.

SYSTEM FEATURES FOR VARIATIONS:
${features.slice(0, 6).map((f, i) => `${i + 1}. ${f.feature_name}: ${f.technical_description || 'Component'}`).join('\n')}

Generate 5-7 paragraphs covering:
1. Alternative implementation #1 - different architecture approach
2. Alternative implementation #2 - different deployment model
3. Alternative implementation #3 - scalability variation
4. How all components integrate and operate together
5. Complete operational workflow from initialization to output
6. Configuration options and customization points
7. Scope of the invention and equivalent variations

Use phrases like "In an alternative embodiment...", "In yet another aspect...", "Those skilled in the art will appreciate..."
DO NOT include section headings. Write as continuous prose.`
  };

  const response = await generateText(prompts[chunkType], 'patent_specification_detailed');
  return response.trim();
}

async function generateDetailedDescriptionSection(
  features: any[]
): Promise<string> {
  const chunks = await Promise.all([
    generateDetailedDescriptionChunk('overview', features),
    generateDetailedDescriptionChunk('components', features),
    generateDetailedDescriptionChunk('algorithms', features),
    generateDetailedDescriptionChunk('embodiments', features)
  ]);

  return chunks.join('\n\n');
}

async function generateAbstractSection(
  title: string,
  features: any[]
): Promise<string> {
  const coreFeatures = features.filter(f => f.is_core_innovation).slice(0, 3);

  const prompt = `Generate an abstract for a patent application. USPTO limit is 150 words.

Title: ${title}

Core Features:
${coreFeatures.map(f => `- ${f.feature_name}: ${f.technical_description}`).join('\n')}

Write a concise abstract (under 150 words) that:
1. Describes what the invention is in one sentence
2. Explains the technical approach
3. Lists the key novel features
4. Mentions primary advantages
5. Uses clear technical language

The abstract should be readable by non-experts but technically accurate.`;

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
