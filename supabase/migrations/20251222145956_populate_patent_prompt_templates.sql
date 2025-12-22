/*
  # Populate Patent Prompt Templates

  1. Overview
    - Updates existing patent prompt templates with production-ready content
    - Creates version 1 with actual prompt content for previously empty templates
    - Marks versions as deployed for immediate use

  2. Templates Updated
    - patent_claims_independent: Independent patent claims generation
    - patent_claims_dependent: Dependent patent claims generation
    - patent_field_of_invention: Field of Invention section
    - patent_background_section: Background of the Invention
    - patent_summary_section: Summary of the Invention
    - patent_details_description: Detailed Description
    - patent_section_regeneration: Section regeneration
    - patent_differentiation_analysis: Differentiation analysis
    - patent_art_comparison: Prior art comparison
    - prior_art_search: Prior art search strategy
    - patent_novelty_analysis: Novelty assessment
    - patent_abstract_generation: Patent abstract

  3. Security
    - No changes to RLS policies
    - Maintains existing access patterns

  4. Notes
    - This migration updates prompt_template_versions table
    - Existing versions with content are preserved
    - Only empty versions are updated
*/

DO $$
DECLARE
  v_template_id uuid;
  v_version_id uuid;
  v_prompt_content text;
BEGIN
  -- patent_claims_independent
  SELECT id INTO v_template_id FROM prompt_templates WHERE prompt_key = 'patent_claims_independent' AND organization_id IS NULL LIMIT 1;
  IF v_template_id IS NOT NULL THEN
    SELECT id INTO v_version_id FROM prompt_template_versions WHERE prompt_template_id = v_template_id AND is_deployed = true LIMIT 1;
    IF v_version_id IS NOT NULL THEN
      v_prompt_content := 'Generate independent patent claims for the following invention. Create claims that are broad enough to provide meaningful protection while being specific enough to distinguish from prior art.

INVENTION TITLE: ${title}

CORE NOVEL FEATURES:
${features}

NOVELTY ASSESSMENT:
${noveltyAnalysis}

INVENTION CONTEXT:
${inventionDescription}

Generate exactly 2 independent claims:
1. One METHOD claim (computer-implemented method) - Start with "A computer-implemented method for..."
2. One SYSTEM claim (system with processors and storage) - Start with "A system comprising..."

USPTO FORMATTING REQUIREMENTS:
- Each claim MUST be a single sentence
- Use semicolons to separate claim elements
- Use proper antecedent basis ("a/an" for first mention, "the/said" for subsequent)
- Include the preamble, transitional phrase ("comprising"), and body
- Method claims should use gerund form (-ing verbs) for steps
- System claims should list components with their functions
- Be specific about technical implementations while maintaining breadth
- Cover the end-to-end workflow where applicable

Format your response as a JSON array of claim strings:
["claim 1 text...", "claim 2 text..."]';
      
      UPDATE prompt_template_versions 
      SET prompt_content = v_prompt_content,
          change_notes = 'Production-ready USPTO-compliant prompt',
          variables_schema = '[{"name":"title","description":"Patent application title","type":"string","required":true},{"name":"features","description":"Core novel features","type":"string","required":true},{"name":"noveltyAnalysis","description":"Novelty assessment","type":"string","required":false},{"name":"inventionDescription","description":"Invention description","type":"string","required":false}]'::jsonb
      WHERE id = v_version_id AND (prompt_content IS NULL OR prompt_content = '');
    END IF;
  END IF;

  -- patent_claims_dependent
  SELECT id INTO v_template_id FROM prompt_templates WHERE prompt_key = 'patent_claims_dependent' AND organization_id IS NULL LIMIT 1;
  IF v_template_id IS NOT NULL THEN
    SELECT id INTO v_version_id FROM prompt_template_versions WHERE prompt_template_id = v_template_id AND is_deployed = true LIMIT 1;
    IF v_version_id IS NOT NULL THEN
      v_prompt_content := 'Generate dependent patent claims based on the independent claims and features provided. Dependent claims narrow the scope and provide fallback positions if independent claims are challenged.

INDEPENDENT CLAIMS:
${independentClaims}

AVAILABLE FEATURES TO COVER:
${features}

Generate 15-18 dependent claims that:
1. Reference parent claims properly using "The method of claim X, wherein..." or "The system of claim Y, further comprising..."
2. Cover specific implementations of features
3. Include algorithm details, data structures, and technical specifications
4. Provide fallback positions if independent claims are challenged
5. Cover variations and alternative embodiments

USPTO FORMATTING REQUIREMENTS:
- Start each claim with "The [method/system] of claim [N]"
- Use "wherein" to add limitations or "further comprising" to add elements
- Maintain proper antecedent basis from parent claims
- Each dependent claim should add meaningful limitations
- Include specific technical details (formulas, data structures, protocols)

Distribute claims: approximately 60% depending on claim 1 (method), 40% on claim 2 (system).

Format as JSON array:
[
  {"claimText": "The method of claim 1, wherein...", "parentClaimNumber": 1},
  {"claimText": "The system of claim 2, further comprising...", "parentClaimNumber": 2}
]';
      
      UPDATE prompt_template_versions 
      SET prompt_content = v_prompt_content,
          change_notes = 'Production-ready USPTO-compliant prompt',
          variables_schema = '[{"name":"independentClaims","description":"Previously generated independent claims","type":"string","required":true},{"name":"features","description":"Features to cover","type":"string","required":true}]'::jsonb
      WHERE id = v_version_id AND (prompt_content IS NULL OR prompt_content = '');
    END IF;
  END IF;

  -- patent_field_of_invention
  SELECT id INTO v_template_id FROM prompt_templates WHERE prompt_key = 'patent_field_of_invention' AND organization_id IS NULL LIMIT 1;
  IF v_template_id IS NOT NULL THEN
    SELECT id INTO v_version_id FROM prompt_template_versions WHERE prompt_template_id = v_template_id AND is_deployed = true LIMIT 1;
    IF v_version_id IS NOT NULL THEN
      v_prompt_content := 'Generate the "Field of the Invention" section for a patent application.

TITLE: ${title}
TECHNICAL FIELD: ${technicalField}
INVENTION DESCRIPTION: ${inventionDescription}

KEY FEATURES:
${features}

Write a concise 2-3 sentence field section that:
1. Identifies the technical field based on the invention description provided
2. Describes the general area of application
3. Uses proper patent language

USPTO FORMAT:
"The present invention relates generally to [broad field], and more particularly to [specific technical area and application]."

IMPORTANT:
- Base your response ONLY on the invention description and features provided
- Do NOT include the section heading "Field of the Invention"
- Only provide the paragraph content itself
- Be specific to the actual invention described, not generic software
- If the invention relates to animation/video production, mention that specifically
- If it relates to patent management software, mention that specifically';
      
      UPDATE prompt_template_versions 
      SET prompt_content = v_prompt_content,
          change_notes = 'Production-ready USPTO-compliant prompt',
          variables_schema = '[{"name":"title","description":"Patent title","type":"string","required":true},{"name":"technicalField","description":"Technical field","type":"string","required":false},{"name":"inventionDescription","description":"Invention description","type":"string","required":false},{"name":"features","description":"Key features","type":"string","required":true}]'::jsonb
      WHERE id = v_version_id AND (prompt_content IS NULL OR prompt_content = '');
    END IF;
  END IF;

  -- patent_background_section
  SELECT id INTO v_template_id FROM prompt_templates WHERE prompt_key = 'patent_background_section' AND organization_id IS NULL LIMIT 1;
  IF v_template_id IS NOT NULL THEN
    SELECT id INTO v_version_id FROM prompt_template_versions WHERE prompt_template_id = v_template_id AND is_deployed = true LIMIT 1;
    IF v_version_id IS NOT NULL THEN
      v_prompt_content := 'Generate a comprehensive "Background of the Invention" section for a patent application. Target 600-1000 words.

INVENTION BEING PATENTED:
${inventionDescription}

PROBLEM THE INVENTION SOLVES:
${problemSolved}

PRIOR ART ANALYSIS:
${priorArt}

DIFFERENTIATION POINTS:
${differentiationPoints}

Generate a COMPLETE background section with the following structure (5-8 paragraphs):

**PARAGRAPH 1: Field Context**
- Introduce the broader technical field relevant to the invention
- Set the stage for technical discussion

**PARAGRAPH 2-3: State of the Art**
- Describe current existing technologies and approaches
- Explain how conventional systems work
- Reference specific prior art where applicable

**PARAGRAPH 4-5: Limitations and Problems**
- Identify specific technical limitations in existing solutions
- Describe inefficiencies, gaps, or problems that remain unsolved
- Use phrases like "However, existing systems fail to..." or "Current approaches are limited by..."

**PARAGRAPH 6-7: Need for Innovation**
- Articulate why a new approach is needed
- Connect limitations to real-world impact
- Build the case for why the invention matters

**PARAGRAPH 8: Transition (Optional)**
- Brief statement indicating improvement is possible
- Do NOT describe the invention itself

USPTO REQUIREMENTS:
- Do NOT include the section heading "Background of the Invention"
- Do NOT describe YOUR invention in this section
- Focus only on what existed BEFORE your invention
- Be factual and technical, avoid marketing language
- Use passive voice where appropriate for formal tone';
      
      UPDATE prompt_template_versions 
      SET prompt_content = v_prompt_content,
          change_notes = 'Production-ready USPTO-compliant prompt',
          variables_schema = '[{"name":"inventionDescription","description":"Invention description","type":"string","required":false},{"name":"problemSolved","description":"Problem being solved","type":"string","required":false},{"name":"priorArt","description":"Prior art references","type":"string","required":true},{"name":"differentiationPoints","description":"Differentiation points","type":"string","required":false}]'::jsonb
      WHERE id = v_version_id AND (prompt_content IS NULL OR prompt_content = '');
    END IF;
  END IF;

  -- patent_summary_section
  SELECT id INTO v_template_id FROM prompt_templates WHERE prompt_key = 'patent_summary_section' AND organization_id IS NULL LIMIT 1;
  IF v_template_id IS NOT NULL THEN
    SELECT id INTO v_version_id FROM prompt_template_versions WHERE prompt_template_id = v_template_id AND is_deployed = true LIMIT 1;
    IF v_version_id IS NOT NULL THEN
      v_prompt_content := 'Generate a "Summary of the Invention" section for a patent application. Target 400-600 words.

INVENTION TITLE: ${title}

KEY FEATURES:
${features}

DIFFERENTIATION FROM PRIOR ART:
${differentiationPoints}

INVENTION DESCRIPTION:
${inventionDescription}

PROBLEM SOLVED:
${problemSolved}

Generate a summary section with this structure:

**PARAGRAPH 1: Overview Statement**
- Begin with "The present invention provides..." or "In accordance with the present invention..."
- Provide high-level description of what the invention does
- Mention the primary technical approach

**PARAGRAPH 2-3: Key Technical Features**
- Describe the main components or method steps at a high level
- Highlight what makes the approach novel
- Connect features to the problems they solve

**PARAGRAPH 4: Technical Advantages**
- List specific advantages over prior art
- Use phrases like "advantageously," "beneficially," "in one aspect"
- Be specific about improvements (efficiency, accuracy, cost, etc.)

**PARAGRAPH 5: Scope Statement (Optional)**
- Brief mention of various embodiments
- "In various embodiments, the invention may..."

USPTO REQUIREMENTS:
- Do NOT include the section heading "Summary of the Invention"
- This section should provide a concise overview, not exhaustive detail
- Mirror the language and scope of your broadest independent claim
- Avoid absolute statements; use "may," "can," "in some embodiments"
- Do not include claim numbers or reference specific claims';
      
      UPDATE prompt_template_versions 
      SET prompt_content = v_prompt_content,
          change_notes = 'Production-ready USPTO-compliant prompt',
          variables_schema = '[{"name":"title","description":"Patent title","type":"string","required":true},{"name":"features","description":"Key features","type":"string","required":true},{"name":"differentiationPoints","description":"Differentiation points","type":"string","required":false},{"name":"inventionDescription","description":"Invention description","type":"string","required":false},{"name":"problemSolved","description":"Problem solved","type":"string","required":false}]'::jsonb
      WHERE id = v_version_id AND (prompt_content IS NULL OR prompt_content = '');
    END IF;
  END IF;

  -- patent_details_description
  SELECT id INTO v_template_id FROM prompt_templates WHERE prompt_key = 'patent_details_description' AND organization_id IS NULL LIMIT 1;
  IF v_template_id IS NOT NULL THEN
    SELECT id INTO v_version_id FROM prompt_template_versions WHERE prompt_template_id = v_template_id AND is_deployed = true LIMIT 1;
    IF v_version_id IS NOT NULL THEN
      v_prompt_content := 'Generate a portion of the "Detailed Description of the Preferred Embodiments" section for a patent application.

SECTION TO GENERATE: ${sectionType}

INVENTION TITLE: ${title}

FEATURES TO DESCRIBE:
${features}

INVENTION CONTEXT:
${inventionDescription}

TECHNICAL FIELD:
${technicalField}

Generate detailed technical content following USPTO requirements:

**FOR SYSTEM OVERVIEW SECTIONS:**
- Describe the overall architecture and components
- Explain how components interact
- Reference figure numbers if applicable ("As shown in FIG. 1...")
- Use reference numerals for components (e.g., "processor 102", "database 104")

**FOR METHOD/PROCESS SECTIONS:**
- Describe step-by-step operation
- Explain data flow and transformations
- Include specific algorithms or formulas where applicable
- Reference flowchart figures if applicable

**FOR IMPLEMENTATION DETAILS:**
- Provide specific technical implementation options
- Include code structures, data formats, or protocols
- Describe alternative embodiments ("In another embodiment...")
- Cover edge cases and error handling

**FOR COMPONENT DESCRIPTIONS:**
- Describe each major component''s function and structure
- Explain internal operation
- Describe interfaces with other components

USPTO REQUIREMENTS:
- Do NOT include section headings
- Use consistent terminology throughout
- Provide enough detail to enable one skilled in the art to practice the invention
- Include alternative embodiments to broaden protection
- Use reference numerals consistently
- Describe both preferred and alternative implementations';
      
      UPDATE prompt_template_versions 
      SET prompt_content = v_prompt_content,
          change_notes = 'Production-ready USPTO-compliant prompt',
          variables_schema = '[{"name":"sectionType","description":"Section type","type":"string","required":true},{"name":"title","description":"Patent title","type":"string","required":true},{"name":"features","description":"Features to describe","type":"string","required":true},{"name":"inventionDescription","description":"Invention description","type":"string","required":false},{"name":"technicalField","description":"Technical field","type":"string","required":false}]'::jsonb
      WHERE id = v_version_id AND (prompt_content IS NULL OR prompt_content = '');
    END IF;
  END IF;

  -- patent_section_regeneration
  SELECT id INTO v_template_id FROM prompt_templates WHERE prompt_key = 'patent_section_regeneration' AND organization_id IS NULL LIMIT 1;
  IF v_template_id IS NOT NULL THEN
    SELECT id INTO v_version_id FROM prompt_template_versions WHERE prompt_template_id = v_template_id AND is_deployed = true LIMIT 1;
    IF v_version_id IS NOT NULL THEN
      v_prompt_content := 'Regenerate a patent application section based on the provided context and instructions.

SECTION TYPE: ${sectionType}
CURRENT CONTENT: ${currentContent}

REGENERATION INSTRUCTIONS:
${instructions}

ADDITIONAL CONTEXT:
${context}

INVENTION DESCRIPTION:
${inventionDescription}

Regenerate the section following these guidelines:

1. MAINTAIN USPTO COMPLIANCE
   - Use proper patent language and formatting
   - Maintain appropriate section length for the section type
   - Follow antecedent basis rules

2. ADDRESS THE INSTRUCTIONS
   - Incorporate the specific changes requested
   - Maintain consistency with other sections
   - Preserve technical accuracy

3. PRESERVE STRENGTHS
   - Keep effective language from the original where appropriate
   - Maintain technical depth and specificity
   - Ensure claims are still supported

4. IMPROVE WEAKNESSES
   - Address any identified issues in the instructions
   - Enhance clarity where needed
   - Strengthen patent protection where possible

OUTPUT:
- Provide ONLY the regenerated section content
- Do NOT include section headings unless specifically requested
- Do NOT include explanatory comments or meta-text';
      
      UPDATE prompt_template_versions 
      SET prompt_content = v_prompt_content,
          change_notes = 'Production-ready USPTO-compliant prompt',
          variables_schema = '[{"name":"sectionType","description":"Section type","type":"string","required":true},{"name":"currentContent","description":"Current content","type":"string","required":true},{"name":"instructions","description":"Regeneration instructions","type":"string","required":true},{"name":"context","description":"Additional context","type":"string","required":false},{"name":"inventionDescription","description":"Invention description","type":"string","required":false}]'::jsonb
      WHERE id = v_version_id AND (prompt_content IS NULL OR prompt_content = '');
    END IF;
  END IF;

  -- patent_differentiation_analysis
  SELECT id INTO v_template_id FROM prompt_templates WHERE prompt_key = 'patent_differentiation_analysis' AND organization_id IS NULL LIMIT 1;
  IF v_template_id IS NOT NULL THEN
    SELECT id INTO v_version_id FROM prompt_template_versions WHERE prompt_template_id = v_template_id AND is_deployed = true LIMIT 1;
    IF v_version_id IS NOT NULL THEN
      v_prompt_content := 'Analyze how the invention differs from the identified prior art. Provide a comprehensive differentiation analysis.

INVENTION FEATURES:
${features}

PRIOR ART REFERENCES:
${priorArt}

INVENTION DESCRIPTION:
${inventionDescription}

Provide a detailed analysis including:

1. **FEATURE-BY-FEATURE COMPARISON**
   For each major feature of the invention:
   - Identify if prior art teaches this feature
   - If partially taught, explain what''s missing
   - If not taught, explain why it''s novel

2. **POINTS OF NOVELTY**
   List specific technical aspects that are NOT found in prior art:
   - Novel combinations of known elements
   - New technical approaches
   - Improved implementations
   - Unique architectural decisions

3. **TECHNICAL ADVANTAGES**
   Explain concrete benefits over prior art:
   - Performance improvements
   - Cost reductions
   - Efficiency gains
   - User experience enhancements
   - Scalability benefits

4. **DISTANCE SCORE**
   Provide an overall assessment:
   - Score from 1-10 (10 = completely novel)
   - Justification for the score
   - Key differentiating factors

5. **CLAIM DRAFTING GUIDANCE**
   Suggest how to emphasize differences in claims:
   - Which features to highlight
   - Recommended claim structure
   - Potential vulnerabilities to address

Format response as JSON:
{
  "pointsOfNovelty": ["point 1", "point 2", ...],
  "technicalAdvantages": ["advantage 1", "advantage 2", ...],
  "distanceScore": 8,
  "featureComparison": [...],
  "claimGuidance": "..."
}';
      
      UPDATE prompt_template_versions 
      SET prompt_content = v_prompt_content,
          change_notes = 'Production-ready USPTO-compliant prompt',
          variables_schema = '[{"name":"features","description":"Invention features","type":"string","required":true},{"name":"priorArt","description":"Prior art references","type":"string","required":true},{"name":"inventionDescription","description":"Invention description","type":"string","required":false}]'::jsonb
      WHERE id = v_version_id AND (prompt_content IS NULL OR prompt_content = '');
    END IF;
  END IF;

  -- patent_art_comparison
  SELECT id INTO v_template_id FROM prompt_templates WHERE prompt_key = 'patent_art_comparison' AND organization_id IS NULL LIMIT 1;
  IF v_template_id IS NOT NULL THEN
    SELECT id INTO v_version_id FROM prompt_template_versions WHERE prompt_template_id = v_template_id AND is_deployed = true LIMIT 1;
    IF v_version_id IS NOT NULL THEN
      v_prompt_content := 'Perform a detailed side-by-side comparison between the invention and specific prior art reference.

INVENTION:
Title: ${inventionTitle}
Features: ${inventionFeatures}
Description: ${inventionDescription}

PRIOR ART REFERENCE:
Patent Number: ${priorArtNumber}
Title: ${priorArtTitle}
Abstract: ${priorArtAbstract}

Provide a structured comparison:

1. **SCOPE COMPARISON**
   - What problem does each solve?
   - What is the technical approach of each?
   - What is the intended use case?

2. **TECHNICAL ELEMENT COMPARISON**
   Create a comparison table (in text format):
   | Element | Invention | Prior Art | Difference |

   Cover:
   - Core algorithms/methods
   - System architecture
   - Data structures
   - User interactions
   - Integration points

3. **OVERLAP ANALYSIS**
   - What elements are shared?
   - How similar are the implementations?
   - Could claims be drafted to avoid overlap?

4. **DIFFERENTIATION OPPORTUNITIES**
   - What unique elements does the invention have?
   - What limitations does the prior art have?
   - How can claims emphasize differences?

5. **RISK ASSESSMENT**
   - Could prior art be used to reject claims?
   - What arguments could overcome rejection?
   - Recommended claim scope adjustments

Provide analysis in clear, technical language suitable for patent prosecution.';
      
      UPDATE prompt_template_versions 
      SET prompt_content = v_prompt_content,
          change_notes = 'Production-ready USPTO-compliant prompt',
          variables_schema = '[{"name":"inventionTitle","description":"Invention title","type":"string","required":true},{"name":"inventionFeatures","description":"Invention features","type":"string","required":true},{"name":"inventionDescription","description":"Invention description","type":"string","required":false},{"name":"priorArtNumber","description":"Prior art patent number","type":"string","required":true},{"name":"priorArtTitle","description":"Prior art title","type":"string","required":true},{"name":"priorArtAbstract","description":"Prior art abstract","type":"string","required":true}]'::jsonb
      WHERE id = v_version_id AND (prompt_content IS NULL OR prompt_content = '');
    END IF;
  END IF;

  -- prior_art_search
  SELECT id INTO v_template_id FROM prompt_templates WHERE prompt_key = 'prior_art_search' AND organization_id IS NULL LIMIT 1;
  IF v_template_id IS NOT NULL THEN
    SELECT id INTO v_version_id FROM prompt_template_versions WHERE prompt_template_id = v_template_id AND is_deployed = true LIMIT 1;
    IF v_version_id IS NOT NULL THEN
      v_prompt_content := 'Analyze the invention and suggest prior art search strategies.

INVENTION TITLE: ${title}

INVENTION DESCRIPTION:
${inventionDescription}

TECHNICAL FEATURES:
${features}

ANALYSIS TARGET: ${analysisTarget}

Provide a comprehensive prior art search strategy:

1. **KEY SEARCH TERMS**
   Identify technical terms for patent database searches:
   - Primary terms (most specific to invention)
   - Secondary terms (related technologies)
   - Alternative terminology (synonyms, variants)
   - CPC/IPC classification codes to search

2. **TECHNOLOGY AREAS**
   Identify relevant technology domains:
   - Core technology area
   - Adjacent technology areas
   - Potential overlap areas

3. **SPECIFIC SEARCH QUERIES**
   Provide 5-10 specific search queries for patent databases:
   - Boolean search strings
   - Keyword combinations
   - Classification-based searches

4. **COMPANIES/ASSIGNEES TO REVIEW**
   Suggest entities likely to have relevant patents:
   - Major players in the field
   - Research institutions
   - Specific inventors if known

5. **NON-PATENT LITERATURE**
   Suggest other sources to check:
   - Academic papers
   - Industry publications
   - Standards documents
   - Open source projects

6. **FOCUS AREAS BY ANALYSIS TARGET**
   For video_production: Focus on animation, media processing, content generation
   For patent_management: Focus on IP management, legal document generation, workflow
   For both: Cover integrated platform approaches

Format response as JSON:
{
  "primaryTerms": [...],
  "secondaryTerms": [...],
  "cpcCodes": [...],
  "searchQueries": [...],
  "assigneesToReview": [...],
  "nonPatentSources": [...],
  "focusAreas": [...]
}';
      
      UPDATE prompt_template_versions 
      SET prompt_content = v_prompt_content,
          change_notes = 'Production-ready USPTO-compliant prompt',
          variables_schema = '[{"name":"title","description":"Invention title","type":"string","required":true},{"name":"inventionDescription","description":"Invention description","type":"string","required":false},{"name":"features","description":"Technical features","type":"string","required":true},{"name":"analysisTarget","description":"Analysis target","type":"string","required":false}]'::jsonb
      WHERE id = v_version_id AND (prompt_content IS NULL OR prompt_content = '');
    END IF;
  END IF;

  -- patent_novelty_analysis
  SELECT id INTO v_template_id FROM prompt_templates WHERE prompt_key = 'patent_novelty_analysis' AND organization_id IS NULL LIMIT 1;
  IF v_template_id IS NOT NULL THEN
    SELECT id INTO v_version_id FROM prompt_template_versions WHERE prompt_template_id = v_template_id AND is_deployed = true LIMIT 1;
    IF v_version_id IS NOT NULL THEN
      v_prompt_content := 'Assess the patentability and novelty of the invention based on the provided features and prior art.

INVENTION TITLE: ${title}

EXTRACTED FEATURES:
${features}

PRIOR ART REFERENCES:
${priorArt}

INVENTION DESCRIPTION:
${inventionDescription}

Provide a comprehensive novelty assessment:

1. **OVERALL PATENTABILITY ASSESSMENT**
   - Is the invention likely patentable? (Yes/No/Potentially with modifications)
   - Confidence level (High/Medium/Low)
   - Brief summary of reasoning

2. **NOVELTY ANALYSIS** (35 U.S.C. Section 102)
   For each major feature:
   - Is it novel (not found in single prior art reference)?
   - Which prior art references are closest?
   - Specific elements that establish novelty

3. **NON-OBVIOUSNESS ANALYSIS** (35 U.S.C. Section 103)
   - Would the combination be obvious to one skilled in the art?
   - What makes the combination non-obvious?
   - Teaching away arguments
   - Unexpected results

4. **FEATURE NOVELTY SCORES**
   Rate each feature:
   - Score: 1-10 (10 = highly novel)
   - Is it a core innovation? (Yes/No)
   - Recommended claim strategy

5. **RECOMMENDED CLAIM FOCUS**
   - Which features should be emphasized in independent claims?
   - Which features are best for dependent claims?
   - Any features to avoid claiming?

6. **POTENTIAL REJECTIONS**
   - Anticipate likely examiner objections
   - Suggested responses/arguments

Format response as JSON:
{
  "patentabilityAssessment": "...",
  "confidenceLevel": "High",
  "isLikelyPatentable": true,
  "noveltyAnalysis": [...],
  "nonObviousnessFactors": [...],
  "featureScores": [...],
  "claimRecommendations": "...",
  "potentialRejections": [...]
}';
      
      UPDATE prompt_template_versions 
      SET prompt_content = v_prompt_content,
          change_notes = 'Production-ready USPTO-compliant prompt',
          variables_schema = '[{"name":"title","description":"Invention title","type":"string","required":true},{"name":"features","description":"Extracted features","type":"string","required":true},{"name":"priorArt","description":"Prior art references","type":"string","required":false},{"name":"inventionDescription","description":"Invention description","type":"string","required":false}]'::jsonb
      WHERE id = v_version_id AND (prompt_content IS NULL OR prompt_content = '');
    END IF;
  END IF;

  -- patent_abstract_generation (update if empty)
  SELECT id INTO v_template_id FROM prompt_templates WHERE prompt_key = 'patent_abstract_generation' AND organization_id IS NULL LIMIT 1;
  IF v_template_id IS NOT NULL THEN
    SELECT id INTO v_version_id FROM prompt_template_versions WHERE prompt_template_id = v_template_id AND is_deployed = true LIMIT 1;
    IF v_version_id IS NOT NULL THEN
      v_prompt_content := 'Generate a patent abstract for the following invention.

TITLE: ${title}

KEY FEATURES:
${features}

INVENTION DESCRIPTION:
${inventionDescription}

USPTO ABSTRACT REQUIREMENTS:
- MUST be 150 words or fewer (strict limit)
- MUST be a single paragraph
- Should summarize the technical disclosure
- Should highlight the novel aspects
- Written in third person
- No legal claims language
- No "the present invention" phrasing in first sentence

STRUCTURE:
1. Opening sentence: What the invention is (system/method/apparatus)
2. Key components or steps (2-3 sentences)
3. Primary technical advantage or result (1 sentence)

EXAMPLE FORMAT:
"A [system/method] for [primary function] comprising [key elements]. The [system/method] includes [main components/steps]. [Technical advantage or result]."

Generate ONLY the abstract text, no heading or additional commentary.';
      
      UPDATE prompt_template_versions 
      SET prompt_content = v_prompt_content,
          change_notes = 'Production-ready USPTO-compliant prompt',
          variables_schema = '[{"name":"title","description":"Patent title","type":"string","required":true},{"name":"features","description":"Key features","type":"string","required":true},{"name":"inventionDescription","description":"Invention description","type":"string","required":false}]'::jsonb
      WHERE id = v_version_id AND (prompt_content IS NULL OR prompt_content = '');
    END IF;
  END IF;

END $$;
