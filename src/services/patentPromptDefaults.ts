export interface PatentPromptTemplate {
  key: string;
  name: string;
  description: string;
  content: string;
  variables: Array<{
    name: string;
    description: string;
    type: 'string' | 'number' | 'array' | 'object';
    required: boolean;
    example?: string;
  }>;
}

export const PATENT_PROMPT_TEMPLATES: Record<string, PatentPromptTemplate> = {
  patent_claims_independent: {
    key: 'patent_claims_independent',
    name: 'Independent Patent Claims',
    description: 'Generates broad independent claims covering core innovations for method and system categories',
    content: `Generate independent patent claims for the following invention. Create claims that are TECHNICALLY SPECIFIC to survive Alice/Mayo subject matter eligibility challenges while providing meaningful protection.

INVENTION TITLE: \${title}

CORE NOVEL FEATURES:
\${features}

NOVELTY ASSESSMENT:
\${noveltyAnalysis}

INVENTION CONTEXT:
\${inventionDescription}

**CROWN JEWEL CLAIM PILLARS** - Focus claims on these 4 technical innovation areas:

1. **SELF-DOCUMENTING CODE ANALYSIS**
   - Parser that traverses abstract syntax trees (AST)
   - Extraction of function signatures, class hierarchies, data flows
   - Automated identification of patentable features from source code
   - Technical transformation: raw code -> structured patent-ready documentation

2. **AI-COMPLIANCE WORKFLOW ORCHESTRATION**
   - Multi-stage pipeline coordinating LLM calls with validation gates
   - Prompt templating with variable interpolation and version control
   - Structured output parsing with JSON schema enforcement
   - Rate limiting and retry logic with exponential backoff

3. **ASSET DECAY ALGORITHM**
   - Mathematical formula: decay_multiplier = max(floor_value, decay_rate^(episode_number - 1))
   - Cost optimization model tracking human editing time reduction over iterations
   - Configurable parameters for different production scenarios
   - Comparative analysis engine vs traditional methods

4. **PIPELINE ORCHESTRATION & STATE MACHINE**
   - Directed acyclic graph (DAG) of dependent generation tasks
   - Checkpoint/resume capability with persistent state storage
   - Multi-provider failover with automatic service switching
   - Progress tracking with granular status updates

**ALICE-DEFENSE LANGUAGE REQUIREMENTS** (CRITICAL):
- Use "processor configured to execute" NOT "computer performs"
- Use "parsing abstract syntax trees" NOT "analyzing code"
- Use "transmitting via API endpoints" NOT "sending data"
- Reference SPECIFIC data structures (JSON schemas, database tables, cache layers)
- Include QUANTIFIABLE improvements (latency reduction, cost savings percentages)
- Describe TECHNICAL TRANSFORMATIONS (input data -> transformed output)

**AVOID THESE ABSTRACT PHRASES:**
- "managing", "organizing", "facilitating" (too abstract)
- "using AI to..." (not specific enough)
- "automatically generating" (needs technical HOW)

Generate exactly 2 independent claims:
1. One METHOD claim - Start with "A computer-implemented method for..."
2. One SYSTEM claim - Start with "A system comprising: one or more processors; a non-transitory computer-readable storage medium storing instructions that, when executed..."

USPTO FORMATTING REQUIREMENTS:
- Each claim MUST be a single sentence (use semicolons to separate elements)
- Use proper antecedent basis ("a/an" for first mention, "the/said" for subsequent)
- Method claims should use gerund form (-ing verbs) with TECHNICAL specificity
- System claims should list components with their CONCRETE functions
- Include at least one mathematical formula or specific algorithm reference
- Reference specific data structures by name (e.g., "hash table", "priority queue", "B-tree index")

Format your response as a JSON array of claim strings:
["claim 1 text...", "claim 2 text..."]`,
    variables: [
      { name: 'title', description: 'Patent application title', type: 'string', required: true, example: 'AI-Orchestrated Animation Production System' },
      { name: 'features', description: 'Core novel features in formatted text', type: 'string', required: true },
      { name: 'noveltyAnalysis', description: 'Assessment of patentability and novelty', type: 'string', required: false },
      { name: 'inventionDescription', description: 'User-provided invention description', type: 'string', required: false }
    ]
  },

  patent_claims_dependent: {
    key: 'patent_claims_dependent',
    name: 'Dependent Patent Claims',
    description: 'Generates specific dependent claims that narrow scope and protect specific implementations',
    content: `Generate dependent patent claims based on the independent claims and features provided. Dependent claims narrow the scope and provide fallback positions if independent claims are challenged.

INDEPENDENT CLAIMS:
\${independentClaims}

AVAILABLE FEATURES TO COVER:
\${features}

**ALICE-DEFENSE STRATEGY FOR DEPENDENT CLAIMS:**
Each dependent claim should add TECHNICAL SPECIFICITY that anchors the invention to concrete implementation:

1. **Data Structure Claims** - Specify exact structures:
   - "wherein the cache comprises a least-recently-used (LRU) eviction policy"
   - "wherein the database schema includes a foreign key relationship between..."
   - "wherein the JSON schema defines required fields including..."

2. **Algorithm Claims** - Include mathematical precision:
   - "wherein calculating the decay multiplier comprises: multiplier = max(floor, rate^(n-1))"
   - "wherein the retry logic implements exponential backoff with jitter"
   - "wherein parsing comprises tokenizing using regular expression patterns"

3. **Technical Integration Claims** - Specify protocols/APIs:
   - "wherein transmitting comprises HTTP POST requests with OAuth 2.0 bearer tokens"
   - "wherein the storage medium comprises a PostgreSQL database with row-level security"
   - "wherein the rate limiting implements token bucket algorithm with configurable refill rate"

4. **Performance Claims** - Include measurable improvements:
   - "wherein the caching reduces API latency by at least 40%"
   - "wherein the asset decay model reduces human editing time by 15-20% per iteration"

Generate 15-18 dependent claims that:
1. Reference parent claims properly using "The method of claim X, wherein..." or "The system of claim Y, further comprising..."
2. Cover specific implementations with CONCRETE technical details
3. Include algorithm details, data structures, and protocol specifications
4. Provide fallback positions if independent claims face Alice challenges
5. Cover variations and alternative embodiments

USPTO FORMATTING REQUIREMENTS:
- Start each claim with "The [method/system] of claim [N]"
- Use "wherein" to add limitations or "further comprising" to add elements
- Maintain proper antecedent basis from parent claims
- Each dependent claim should add meaningful TECHNICAL limitations
- Include specific technical details (formulas, data structures, protocols)
- AVOID abstract language - be concrete and specific

Distribute claims: approximately 60% depending on claim 1 (method), 40% on claim 2 (system).

Format as JSON array:
[
  {"claimText": "The method of claim 1, wherein...", "parentClaimNumber": 1},
  {"claimText": "The system of claim 2, further comprising...", "parentClaimNumber": 2}
]`,
    variables: [
      { name: 'independentClaims', description: 'Previously generated independent claims', type: 'string', required: true },
      { name: 'features', description: 'All features to potentially cover', type: 'string', required: true }
    ]
  },

  patent_field_of_invention: {
    key: 'patent_field_of_invention',
    name: 'Patent Field of Invention',
    description: 'Generates concise Field of the Invention section identifying technical domain',
    content: `Generate the "Field of the Invention" section for a patent application.

TITLE: \${title}
TECHNICAL FIELD: \${technicalField}
INVENTION DESCRIPTION: \${inventionDescription}

KEY FEATURES:
\${features}

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
- If it relates to patent management software, mention that specifically`,
    variables: [
      { name: 'title', description: 'Patent application title', type: 'string', required: true },
      { name: 'technicalField', description: 'Technical field context', type: 'string', required: false },
      { name: 'inventionDescription', description: 'Detailed invention description', type: 'string', required: false },
      { name: 'features', description: 'Key technical features', type: 'string', required: true }
    ]
  },

  patent_background_section: {
    key: 'patent_background_section',
    name: 'Patent Background Section',
    description: 'Generates comprehensive Background of the Invention describing prior art limitations and gaps',
    content: `Generate a comprehensive "Background of the Invention" section for a patent application. Target 600-1000 words.

INVENTION BEING PATENTED:
\${inventionDescription}

PROBLEM THE INVENTION SOLVES:
\${problemSolved}

PRIOR ART ANALYSIS:
\${priorArt}

DIFFERENTIATION POINTS:
\${differentiationPoints}

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
- Use passive voice where appropriate for formal tone`,
    variables: [
      { name: 'inventionDescription', description: 'Description of invention being patented', type: 'string', required: false },
      { name: 'problemSolved', description: 'Problem the invention addresses', type: 'string', required: false },
      { name: 'priorArt', description: 'Prior art references and analysis', type: 'string', required: true },
      { name: 'differentiationPoints', description: 'How invention differs from prior art', type: 'string', required: false }
    ]
  },

  patent_summary_section: {
    key: 'patent_summary_section',
    name: 'Patent Summary Section',
    description: 'Generates Summary of the Invention highlighting novel aspects and advantages',
    content: `Generate a "Summary of the Invention" section for a patent application. Target 400-600 words.

INVENTION TITLE: \${title}

KEY FEATURES:
\${features}

DIFFERENTIATION FROM PRIOR ART:
\${differentiationPoints}

INVENTION DESCRIPTION:
\${inventionDescription}

PROBLEM SOLVED:
\${problemSolved}

Generate a summary section with this structure:

**PARAGRAPH 1: Overview Statement**
- Begin with "The present invention provides..." or "In accordance with the present invention..."
- Provide high-level description of what the invention does
- Mention the primary technical approach

**PARAGRAPH 2-3: Key Technical Features**
- Describe the main components or method steps at a high level
- May optionally reference figures: "As shown in FIG. 1, the system 100 includes..."
- Highlight what makes the approach novel
- Connect features to the problems they solve
- Use reference numerals when mentioning components (e.g., "system 100", "engine 110")

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
- Do not include claim numbers or reference specific claims
- NEVER write "(Feature X)" or "Feature X" - describe components by their technical names only
- Always use reference numerals when mentioning components (e.g., "platform 100", "module 118")
- May reference figures but less frequently than in detailed description
- Features are listed for context - incorporate them naturally without numbering`,
    variables: [
      { name: 'title', description: 'Patent application title', type: 'string', required: true },
      { name: 'features', description: 'Key technical features', type: 'string', required: true },
      { name: 'differentiationPoints', description: 'Differentiation from prior art', type: 'string', required: false },
      { name: 'inventionDescription', description: 'Invention description', type: 'string', required: false },
      { name: 'problemSolved', description: 'Problem being solved', type: 'string', required: false }
    ]
  },

  patent_details_description: {
    key: 'patent_details_description',
    name: 'Patent Detailed Description',
    description: 'Generates comprehensive Detailed Description with embodiments and technical implementation',
    content: `Generate a portion of the "Detailed Description of the Preferred Embodiments" section for a patent application.

SECTION TO GENERATE: \${sectionType}

INVENTION TITLE: \${title}

FEATURES TO DESCRIBE:
\${features}

INVENTION CONTEXT:
\${inventionDescription}

TECHNICAL FIELD:
\${technicalField}

FIGURE REFERENCE GUIDE:
- FIG. 1: System architecture / overall platform (reference numerals 100-119)
- FIG. 2: AI Production components and workflow (reference numerals 110-129)
- FIG. 3: Cost modeling and analytics systems (reference numerals 120-129)
- FIG. 4: IP Protection and workflow management (reference numerals 130-149)
- FIG. 5-10: Detailed component views and process flowcharts
- Use "As shown in FIG. X" when first introducing components in each figure
- Reference the appropriate figure based on which system you're describing

CRITICAL REQUIREMENT - FIGURE REFERENCES:
You MUST reference figures throughout the description. Every major component and subsystem MUST be introduced with a figure reference.

CORRECT EXAMPLES:
✓ "As shown in FIG. 1, the animation platform 100 includes a production engine 110..."
✓ "Referring to FIG. 2, the cost modeling system 120 tracks production expenses..."
✓ "Turning to FIG. 3, the IP Protection Suite 130 provides mechanisms to safeguard..."
✓ "With reference to FIG. 1, the AI pipeline 110 processes content..."
✓ "As illustrated in FIG. 4, the asset decay model 122 accounts for depreciation..."

INCORRECT EXAMPLES (NEVER DO THIS):
✗ "The animation platform 100 includes a production engine 110..." (Missing figure reference)
✗ "A cost modeling system 120 tracks production expenses..." (Missing figure reference)
✗ "The IP Protection Suite 130 provides mechanisms..." (Missing figure reference)

Generate detailed technical content following USPTO requirements:

**FOR SYSTEM OVERVIEW SECTIONS:**
- START with a figure reference: "As shown in FIG. 1..." or "Referring to FIG. 1..."
- Describe the overall architecture and components
- Explain how components interact
- Use reference numerals for every component (e.g., "processor 102", "database 104", "system 100")
- Reference additional figures when discussing subsystems: "Turning to FIG. 2, the tracking module 118..."

**FOR METHOD/PROCESS SECTIONS:**
- Begin with figure reference to the flowchart: "As shown in FIG. 3..."
- Describe step-by-step operation with reference numerals for each step
- Explain data flow and transformations
- Include specific algorithms or formulas where applicable

**FOR IMPLEMENTATION DETAILS:**
- Reference figures showing implementation: "As illustrated in FIG. 4..."
- Provide specific technical implementation options
- Include code structures, data formats, or protocols
- Describe alternative embodiments ("In another embodiment, as shown in FIG. 5...")

**FOR COMPONENT DESCRIPTIONS:**
- Introduce each component with figure reference: "Referring to FIG. 2, the monitoring system 120..."
- Describe each major component's function and structure
- Explain internal operation with sub-component reference numerals
- Describe interfaces with other components

USPTO REQUIREMENTS:
- Do NOT include section headings
- MANDATORY: Reference figures at least once per paragraph or when introducing new components
- MANDATORY: Every major component introduction MUST start with "As shown in FIG. X..." or "Referring to FIG. X..."
- Use consistent terminology throughout
- After referencing a figure, you can continue describing related components in that figure
- When moving to components in a different figure, add a new figure reference
- Provide enough detail to enable one skilled in the art to practice the invention
- Use reference numerals consistently (e.g., "module 118", "system 100")
- NEVER write "(Feature X)" or "Feature X" - only use component names with reference numerals
- Do NOT number features - features are listed for context only
- Example flow: "As shown in FIG. 2, the cost modeling system 120 tracks expenses. The system 120 includes an asset decay model 122 which accounts for depreciation. Turning to FIG. 3, the IP Protection Suite 130 provides safeguards..."`,
    variables: [
      { name: 'sectionType', description: 'Type of section being generated', type: 'string', required: true, example: 'system_overview' },
      { name: 'title', description: 'Patent application title', type: 'string', required: true },
      { name: 'features', description: 'Features to describe in detail', type: 'string', required: true },
      { name: 'inventionDescription', description: 'Invention description', type: 'string', required: false },
      { name: 'technicalField', description: 'Technical field context', type: 'string', required: false }
    ]
  },

  patent_section_regeneration: {
    key: 'patent_section_regeneration',
    name: 'Patent Section Regeneration',
    description: 'Regenerates any patent section with specific instructions and context',
    content: `Regenerate a patent application section based on the provided context and instructions.

SECTION TYPE: \${sectionType}
CURRENT CONTENT: \${currentContent}

REGENERATION INSTRUCTIONS:
\${instructions}

ADDITIONAL CONTEXT:
\${context}

INVENTION DESCRIPTION:
\${inventionDescription}

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
- Do NOT include explanatory comments or meta-text`,
    variables: [
      { name: 'sectionType', description: 'Type of section to regenerate', type: 'string', required: true },
      { name: 'currentContent', description: 'Current content of the section', type: 'string', required: true },
      { name: 'instructions', description: 'Specific regeneration instructions', type: 'string', required: true },
      { name: 'context', description: 'Additional context for regeneration', type: 'string', required: false },
      { name: 'inventionDescription', description: 'Invention description', type: 'string', required: false }
    ]
  },

  patent_differentiation_analysis: {
    key: 'patent_differentiation_analysis',
    name: 'Patent Differentiation Analysis',
    description: 'Analyzes how the invention differs from identified prior art references',
    content: `Analyze how the invention differs from the identified prior art. Provide a comprehensive differentiation analysis.

INVENTION FEATURES:
\${features}

PRIOR ART REFERENCES:
\${priorArt}

INVENTION DESCRIPTION:
\${inventionDescription}

Provide a detailed analysis including:

1. **FEATURE-BY-FEATURE COMPARISON**
   For each major feature of the invention:
   - Identify if prior art teaches this feature
   - If partially taught, explain what's missing
   - If not taught, explain why it's novel

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
}`,
    variables: [
      { name: 'features', description: 'Invention features to analyze', type: 'string', required: true },
      { name: 'priorArt', description: 'Prior art references for comparison', type: 'string', required: true },
      { name: 'inventionDescription', description: 'Invention description', type: 'string', required: false }
    ]
  },

  patent_art_comparison: {
    key: 'patent_art_comparison',
    name: 'Patent Art Comparison',
    description: 'Performs side-by-side technical comparison with specific prior art references',
    content: `Perform a detailed side-by-side comparison between the invention and specific prior art reference.

INVENTION:
Title: \${inventionTitle}
Features: \${inventionFeatures}
Description: \${inventionDescription}

PRIOR ART REFERENCE:
Patent Number: \${priorArtNumber}
Title: \${priorArtTitle}
Abstract: \${priorArtAbstract}

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

Provide analysis in clear, technical language suitable for patent prosecution.`,
    variables: [
      { name: 'inventionTitle', description: 'Title of the invention', type: 'string', required: true },
      { name: 'inventionFeatures', description: 'Features of the invention', type: 'string', required: true },
      { name: 'inventionDescription', description: 'Invention description', type: 'string', required: false },
      { name: 'priorArtNumber', description: 'Prior art patent number', type: 'string', required: true },
      { name: 'priorArtTitle', description: 'Prior art title', type: 'string', required: true },
      { name: 'priorArtAbstract', description: 'Prior art abstract', type: 'string', required: true }
    ]
  },

  prior_art_search: {
    key: 'prior_art_search',
    name: 'Prior Art Search',
    description: 'Analyzes codebase and invention to identify relevant prior art search terms and areas',
    content: `Analyze the invention and suggest prior art search strategies.

INVENTION TITLE: \${title}

INVENTION DESCRIPTION:
\${inventionDescription}

TECHNICAL FEATURES:
\${features}

ANALYSIS TARGET: \${analysisTarget}

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
}`,
    variables: [
      { name: 'title', description: 'Invention title', type: 'string', required: true },
      { name: 'inventionDescription', description: 'Detailed invention description', type: 'string', required: false },
      { name: 'features', description: 'Technical features', type: 'string', required: true },
      { name: 'analysisTarget', description: 'Focus area for analysis', type: 'string', required: false, example: 'video_production' }
    ]
  },

  patent_novelty_analysis: {
    key: 'patent_novelty_analysis',
    name: 'Patent Novelty Analysis',
    description: 'Assesses patentability and novelty of invention features against prior art',
    content: `Assess the patentability and novelty of the invention based on the provided features and prior art.

INVENTION TITLE: \${title}

EXTRACTED FEATURES:
\${features}

PRIOR ART REFERENCES:
\${priorArt}

INVENTION DESCRIPTION:
\${inventionDescription}

Provide a comprehensive novelty assessment:

1. **OVERALL PATENTABILITY ASSESSMENT**
   - Is the invention likely patentable? (Yes/No/Potentially with modifications)
   - Confidence level (High/Medium/Low)
   - Brief summary of reasoning

2. **NOVELTY ANALYSIS** (35 U.S.C. § 102)
   For each major feature:
   - Is it novel (not found in single prior art reference)?
   - Which prior art references are closest?
   - Specific elements that establish novelty

3. **NON-OBVIOUSNESS ANALYSIS** (35 U.S.C. § 103)
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
}`,
    variables: [
      { name: 'title', description: 'Invention title', type: 'string', required: true },
      { name: 'features', description: 'Extracted invention features', type: 'string', required: true },
      { name: 'priorArt', description: 'Prior art references', type: 'string', required: false },
      { name: 'inventionDescription', description: 'Invention description', type: 'string', required: false }
    ]
  },

  patent_abstract_generation: {
    key: 'patent_abstract_generation',
    name: 'Patent Abstract Generation',
    description: 'Generates concise 150-word patent abstract highlighting novel aspects',
    content: `Generate a patent abstract for the following invention.

TITLE: \${title}

KEY FEATURES:
\${features}

INVENTION DESCRIPTION:
\${inventionDescription}

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

Generate ONLY the abstract text, no heading or additional commentary.`,
    variables: [
      { name: 'title', description: 'Patent application title', type: 'string', required: true },
      { name: 'features', description: 'Key technical features', type: 'string', required: true },
      { name: 'inventionDescription', description: 'Invention description', type: 'string', required: false }
    ]
  },

  patent_alice_risk_assessment: {
    key: 'patent_alice_risk_assessment',
    name: 'Alice Test Risk Assessment',
    description: 'Evaluates patent claims for Alice/Mayo subject matter eligibility risks',
    content: `Perform an Alice/Mayo subject matter eligibility risk assessment for the following patent application.

INVENTION TITLE: \${title}

CLAIMS:
\${claims}

KEY FEATURES:
\${features}

INVENTION DESCRIPTION:
\${inventionDescription}

**ALICE/MAYO TWO-STEP ANALYSIS:**

STEP 1: Is the claim directed to a judicial exception?
- Abstract ideas (fundamental economic practices, mathematical concepts, mental processes, methods of organizing human activity)
- Laws of nature
- Natural phenomena

STEP 2: If yes, does the claim recite additional elements that amount to "significantly more"?
- Improvements to computer functionality
- Specific technical implementations
- Unconventional arrangements of known elements
- Transformation of data into a different state

**EVALUATE EACH CLAIM FOR:**

1. **Abstract Idea Risk** (High/Medium/Low)
   - Is it describing a business method?
   - Is it a mathematical concept without technical application?
   - Could it be performed mentally or with pen and paper?

2. **Technical Anchoring Strength** (Strong/Moderate/Weak)
   - Does it reference specific hardware components?
   - Does it describe concrete data structures?
   - Does it include specific algorithms with technical effect?

3. **Improvement Evidence** (Present/Partial/Absent)
   - Does it improve computer functionality itself?
   - Does it solve a technical problem in a technical way?
   - Does it describe unconventional technical steps?

**RISK INDICATORS TO FLAG:**
- Generic computer implementation language ("using a computer to...")
- Abstract verbs without technical specificity ("managing", "organizing", "facilitating")
- Missing hardware/data structure references
- Business outcome focus vs technical outcome focus

**PROVIDE:**
1. Overall Alice Risk Score (0-100, where 0 = no risk, 100 = high rejection risk)
2. Risk level for each independent claim
3. Specific vulnerable phrases identified
4. Recommended language improvements
5. Technical anchoring suggestions

Format response as JSON:
{
  "overallAliceRiskScore": 35,
  "riskLevel": "Low",
  "claimAnalysis": [
    {
      "claimNumber": 1,
      "riskScore": 30,
      "riskLevel": "Low",
      "abstractIdeaRisk": "Low",
      "technicalAnchoringStrength": "Strong",
      "improvementEvidence": "Present",
      "vulnerablePhrases": ["phrase 1"],
      "strengths": ["strength 1"],
      "recommendations": ["recommendation 1"]
    }
  ],
  "overallStrengths": ["strength 1", "strength 2"],
  "overallWeaknesses": ["weakness 1"],
  "recommendedImprovements": ["improvement 1", "improvement 2"],
  "summary": "Brief assessment summary"
}`,
    variables: [
      { name: 'title', description: 'Patent application title', type: 'string', required: true },
      { name: 'claims', description: 'Patent claims text', type: 'string', required: true },
      { name: 'features', description: 'Key technical features', type: 'string', required: true },
      { name: 'inventionDescription', description: 'Invention description', type: 'string', required: false }
    ]
  }
};

export function getPatentPromptTemplate(key: string): PatentPromptTemplate | undefined {
  return PATENT_PROMPT_TEMPLATES[key];
}

export function getAllPatentPromptKeys(): string[] {
  return Object.keys(PATENT_PROMPT_TEMPLATES);
}

export function getPatentPromptContent(key: string): string | undefined {
  return PATENT_PROMPT_TEMPLATES[key]?.content;
}

export function getPatentPromptVariables(key: string): PatentPromptTemplate['variables'] {
  return PATENT_PROMPT_TEMPLATES[key]?.variables || [];
}
