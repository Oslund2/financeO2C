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
  const prompt = `Generate the content for a "Background of the Invention" section for a patent application.

Prior Art Patents:
${priorArt.map((pa, i) => `${i + 1}. ${pa.patent_number} - ${pa.patent_title}
   Key limitations: ${pa.similarity_explanation}`).join('\n\n')}

Differentiation Analysis:
${differentiationReports.map(dr => `Points of Novelty: ${dr.points_of_novelty?.join(', ') || 'N/A'}`).join('\n')}

Write a comprehensive background section (3-5 paragraphs) that:
1. Describes the current state of the art
2. Identifies limitations and problems with existing solutions
3. Explains the gaps that prior art fails to address
4. Sets up the need for the present invention
5. Uses professional patent language without directly citing patent numbers

IMPORTANT: Do NOT include the section heading "Background of the Invention" or any similar heading in your output. Only provide the paragraph content itself.

Focus on technical problems, not business problems. Emphasize what prior art CAN'T do.`;

  const response = await generateText(prompt, 'patent_specification_background');
  return response.trim();
}

async function generateSummarySection(
  features: any[],
  differentiationReports: any[]
): Promise<string> {
  const coreFeatures = features.filter(f => f.is_core_innovation);
  const advantages = differentiationReports
    .flatMap(dr => dr.technical_advantages || [])
    .slice(0, 6);

  const prompt = `Generate the content for a "Summary of the Invention" section for a patent application.

Core Innovations:
${coreFeatures.map((f, i) => `${i + 1}. ${f.feature_name}
   ${f.technical_description}`).join('\n\n')}

Technical Advantages:
${advantages.map((adv, i) => `${i + 1}. ${adv}`).join('\n')}

Write a comprehensive summary section (4-6 paragraphs) that:
1. Opens with a concise statement of what the invention is
2. Describes the primary technical approach
3. Lists the key novel features
4. Explains the advantages and benefits
5. Describes how the components work together
6. Uses proper patent language (e.g., "It is therefore an object of the invention to...")

IMPORTANT: Do NOT include the section heading "Summary of the Invention" or any similar heading in your output. Only provide the paragraph content itself.

Emphasize WHAT is novel and WHY it's beneficial.`;

  const response = await generateText(prompt, 'patent_specification_summary');
  return response.trim();
}

async function generateDetailedDescriptionSection(
  features: any[]
): Promise<string> {
  const prompt = `Generate the content for a "Detailed Description of the Invention" section for a patent application.

Features to Describe:
${features.map((f, i) => `${i + 1}. ${f.feature_name} (${f.feature_type})
   Novelty: ${f.novelty_strength}
   Description: ${f.technical_description}
   ${f.code_snippet ? `Implementation: ${f.code_snippet}` : ''}`).join('\n\n')}

Write a comprehensive detailed description (8-12 paragraphs) that:
1. Describes the overall system architecture
2. Explains each major component in technical detail
3. Describes how components interact with each other
4. Provides specific algorithms, formulas, and data structures
5. Includes specific examples and use cases
6. References figures where appropriate (e.g., "As shown in FIG. 1...")
7. Uses technical but clear language
8. Covers multiple embodiments and variations

For algorithms, include:
- Input parameters and their ranges
- Processing steps in detail
- Output format and specifications
- Example calculations

For data structures, include:
- Field names and data types
- Relationships and constraints
- Storage mechanisms

IMPORTANT: Do NOT include the section heading "Detailed Description of the Invention" or any similar heading in your output. Only provide the paragraph content itself.

This section should be the most technically detailed part of the patent.`;

  const response = await generateText(prompt, 'patent_specification_detailed');
  return response.trim();
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
