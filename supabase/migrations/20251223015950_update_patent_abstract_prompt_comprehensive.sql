/*
  # Update Patent Abstract Generation Prompt

  1. Overview
    - Updates the patent_abstract_generation prompt to be more comprehensive
    - Encourages fuller use of the 150-word limit (target 100-150 words)
    - Adds detailed requirements for technical depth and component coverage

  2. Changes
    - Updated prompt content emphasizes using FULL word allowance
    - Added explicit requirement for 4-5 specific technical components
    - Added example showing proper technical depth
    - Changed from brief summary style to comprehensive technical description

  3. Notes
    - This fixes the issue where abstracts were being generated too short (20-30 words)
    - Proper abstracts should be 100-150 words with full technical detail
*/

DO $$
DECLARE
  v_template_id uuid;
  v_version_id uuid;
  v_prompt_content text;
BEGIN
  SELECT id INTO v_template_id FROM prompt_templates WHERE prompt_key = 'patent_abstract_generation' AND organization_id IS NULL LIMIT 1;

  IF v_template_id IS NOT NULL THEN
    SELECT id INTO v_version_id FROM prompt_template_versions WHERE prompt_template_id = v_template_id AND is_deployed = true LIMIT 1;

    IF v_version_id IS NOT NULL THEN
      v_prompt_content := 'Generate a patent abstract for the following invention.

TITLE: ${title}

KEY TECHNICAL FEATURES:
${features}

INVENTION DESCRIPTION:
${inventionDescription}

**USPTO ABSTRACT REQUIREMENTS:**
- Target 100-150 words (use the FULL allowance for maximum technical detail)
- MUST be a single paragraph with no line breaks
- Written in third person, present tense
- No marketing language or subjective claims
- No legal claims language ("comprising", "wherein")
- Should NOT start with "The present invention" or "This invention"
- Do NOT include reference numerals (e.g., "100", "102") in the abstract

**CONTENT REQUIREMENTS (in order of priority):**

1. **OPENING (1 sentence):** State what the invention IS
   - Identify whether it is a system, method, apparatus, or combination
   - Name the primary technical function
   - Example: "A computer-implemented system for orchestrating AI-driven video production..."

2. **CORE ARCHITECTURE (2-3 sentences):** Describe the KEY technical components
   - Name the major modules, components, and their specific functions
   - Explain how components interact or how data flows through the system
   - Include specific technical elements (APIs, algorithms, data structures, processing steps)
   - Use technical terminology appropriate to the field
   - Be SPECIFIC, not generic - name actual technical approaches

3. **KEY INNOVATION (1-2 sentences):** Highlight what makes this novel
   - Describe the unique technical approach or combination
   - Mention specific algorithms, methods, or architectures if applicable
   - Reference quantifiable improvements or unique capabilities

4. **TECHNICAL RESULT (1 sentence):** State the technical outcome
   - What does the system achieve technically?
   - What problem is solved and how?

**QUALITY REQUIREMENTS:**
- The abstract MUST describe technical structure, not just purpose
- The abstract MUST mention at least 4-5 specific technical components or steps
- An engineer reading this abstract should understand what the system does
- The abstract should be substantive enough to differentiate from prior art
- Use all 150 words - brevity is NOT the goal, completeness IS

**EXAMPLE OF PROPER TECHNICAL DEPTH:**
"A computer-implemented system for automated animation production comprising a script analysis engine, a character consistency manager, a shot list generator, and a multi-provider rendering orchestrator. The script analysis engine parses screenplay documents using natural language processing to extract scene metadata, dialogue segments, and character appearances. The character consistency manager maintains visual attribute databases synchronized with cloud storage to ensure character fidelity across generated frames. The shot list generator converts extracted scene data into production-ready shot specifications with camera angles, lighting parameters, and timing metadata. The multi-provider rendering orchestrator coordinates API calls to multiple AI generation services, implementing load balancing and cost optimization algorithms. The system enables end-to-end automated video production while maintaining production quality standards through integrated validation workflows."

Generate ONLY the abstract text. Do not include any heading, label, word count, or commentary.';

      UPDATE prompt_template_versions
      SET prompt_content = v_prompt_content,
          change_notes = 'Updated to comprehensive 100-150 word format with full technical detail requirements'
      WHERE id = v_version_id;

      RAISE NOTICE 'Updated patent_abstract_generation prompt to comprehensive version';
    ELSE
      RAISE NOTICE 'No deployed version found for patent_abstract_generation';
    END IF;
  ELSE
    RAISE NOTICE 'patent_abstract_generation template not found';
  END IF;
END $$;
