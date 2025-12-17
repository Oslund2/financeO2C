/*
  # Seed Patent-Specific Prompt Templates

  1. New Prompts
    - Patent novelty analysis prompt
    - Patent specification prompts (field, background, summary, detailed)
    - Patent claims generation prompts (independent, dependent)
    - Patent prior art prompts (search, comparison, differentiation)
    - Patent abstract generation prompt

  2. Category
    - All prompts use category 'patent'
*/

-- Insert patent category prompts (skip if already exists)
DO $$
BEGIN
  -- Patent novelty analysis
  IF NOT EXISTS (SELECT 1 FROM prompt_templates WHERE prompt_key = 'patent_novelty_analysis') THEN
    INSERT INTO prompt_templates (organization_id, prompt_key, prompt_name, category, description, is_system_default, is_active, variables_schema)
    VALUES (NULL, 'patent_novelty_analysis', 'Patent Novelty Analysis', 'patent', 'Analyzes codebase features and prior art to assess novelty and patentability', true, true, '[]'::jsonb);
  END IF;

  -- Patent specification field
  IF NOT EXISTS (SELECT 1 FROM prompt_templates WHERE prompt_key = 'patent_specification_field') THEN
    INSERT INTO prompt_templates (organization_id, prompt_key, prompt_name, category, description, is_system_default, is_active, variables_schema)
    VALUES (NULL, 'patent_specification_field', 'Patent Field of Invention', 'patent', 'Generates the Field of Invention section identifying the technical domain', true, true, '[]'::jsonb);
  END IF;

  -- Patent specification background
  IF NOT EXISTS (SELECT 1 FROM prompt_templates WHERE prompt_key = 'patent_specification_background') THEN
    INSERT INTO prompt_templates (organization_id, prompt_key, prompt_name, category, description, is_system_default, is_active, variables_schema)
    VALUES (NULL, 'patent_specification_background', 'Patent Background Section', 'patent', 'Generates Background section describing prior art limitations and gaps', true, true, '[]'::jsonb);
  END IF;

  -- Patent specification summary
  IF NOT EXISTS (SELECT 1 FROM prompt_templates WHERE prompt_key = 'patent_specification_summary') THEN
    INSERT INTO prompt_templates (organization_id, prompt_key, prompt_name, category, description, is_system_default, is_active, variables_schema)
    VALUES (NULL, 'patent_specification_summary', 'Patent Summary Section', 'patent', 'Generates Summary section highlighting novel features and advantages', true, true, '[]'::jsonb);
  END IF;

  -- Patent specification detailed
  IF NOT EXISTS (SELECT 1 FROM prompt_templates WHERE prompt_key = 'patent_specification_detailed') THEN
    INSERT INTO prompt_templates (organization_id, prompt_key, prompt_name, category, description, is_system_default, is_active, variables_schema)
    VALUES (NULL, 'patent_specification_detailed', 'Patent Detailed Description', 'patent', 'Generates comprehensive technical description with algorithms and examples', true, true, '[]'::jsonb);
  END IF;

  -- Patent claims independent
  IF NOT EXISTS (SELECT 1 FROM prompt_templates WHERE prompt_key = 'patent_claims_independent') THEN
    INSERT INTO prompt_templates (organization_id, prompt_key, prompt_name, category, description, is_system_default, is_active, variables_schema)
    VALUES (NULL, 'patent_claims_independent', 'Independent Patent Claims', 'patent', 'Generates broad independent claims covering core innovations', true, true, '[]'::jsonb);
  END IF;

  -- Patent claims dependent
  IF NOT EXISTS (SELECT 1 FROM prompt_templates WHERE prompt_key = 'patent_claims_dependent') THEN
    INSERT INTO prompt_templates (organization_id, prompt_key, prompt_name, category, description, is_system_default, is_active, variables_schema)
    VALUES (NULL, 'patent_claims_dependent', 'Dependent Patent Claims', 'patent', 'Generates specific dependent claims protecting implementations', true, true, '[]'::jsonb);
  END IF;

  -- Patent prior art comparison
  IF NOT EXISTS (SELECT 1 FROM prompt_templates WHERE prompt_key = 'patent_prior_art_comparison') THEN
    INSERT INTO prompt_templates (organization_id, prompt_key, prompt_name, category, description, is_system_default, is_active, variables_schema)
    VALUES (NULL, 'patent_prior_art_comparison', 'Prior Art Comparison', 'patent', 'Generates comparison between invention and identified prior art', true, true, '[]'::jsonb);
  END IF;

  -- Patent abstract generation
  IF NOT EXISTS (SELECT 1 FROM prompt_templates WHERE prompt_key = 'patent_abstract_generation') THEN
    INSERT INTO prompt_templates (organization_id, prompt_key, prompt_name, category, description, is_system_default, is_active, variables_schema)
    VALUES (NULL, 'patent_abstract_generation', 'Patent Abstract', 'patent', 'Generates concise abstract under USPTO 150-word limit', true, true, '[]'::jsonb);
  END IF;

  -- Patent differentiation
  IF NOT EXISTS (SELECT 1 FROM prompt_templates WHERE prompt_key = 'patent_differentiation') THEN
    INSERT INTO prompt_templates (organization_id, prompt_key, prompt_name, category, description, is_system_default, is_active, variables_schema)
    VALUES (NULL, 'patent_differentiation', 'Patent Differentiation Analysis', 'patent', 'Analyzes technical differences and advantages over specific prior art', true, true, '[]'::jsonb);
  END IF;

  -- Patent prior art search
  IF NOT EXISTS (SELECT 1 FROM prompt_templates WHERE prompt_key = 'patent_prior_art_search') THEN
    INSERT INTO prompt_templates (organization_id, prompt_key, prompt_name, category, description, is_system_default, is_active, variables_schema)
    VALUES (NULL, 'patent_prior_art_search', 'Prior Art Search', 'patent', 'Identifies relevant prior art patents based on invention description', true, true, '[]'::jsonb);
  END IF;

  -- Patent section regeneration
  IF NOT EXISTS (SELECT 1 FROM prompt_templates WHERE prompt_key = 'patent_section_regeneration') THEN
    INSERT INTO prompt_templates (organization_id, prompt_key, prompt_name, category, description, is_system_default, is_active, variables_schema)
    VALUES (NULL, 'patent_section_regeneration', 'Patent Section Regeneration', 'patent', 'Regenerates specific patent sections based on user feedback', true, true, '[]'::jsonb);
  END IF;
END $$;

-- Create initial versions for patent prompts
DO $$
DECLARE
  template_record RECORD;
BEGIN
  FOR template_record IN 
    SELECT id, prompt_key 
    FROM prompt_templates 
    WHERE prompt_key LIKE 'patent_%'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM prompt_template_versions 
      WHERE prompt_template_id = template_record.id
    ) THEN
      INSERT INTO prompt_template_versions (
        prompt_template_id, 
        version_number, 
        prompt_content, 
        variables_schema, 
        is_deployed, 
        change_notes
      )
      VALUES (
        template_record.id,
        1,
        'System prompt for ' || template_record.prompt_key,
        '[]'::jsonb,
        true,
        'Initial system prompt for patent generation'
      );
    END IF;
  END LOOP;
END $$;