/*
  # Fix Fact Checker: Web-grounded citations and expanded workspace support

  1. Update the `historical_accuracy_check` prompt to:
     - Request `citations_to_create` array in JSON output so the service can
       auto-insert real citations discovered during web research
     - Expand `workspace_types` to cover documentary and general workspaces
       (previously only scoped to photoreal)

  2. Ensure `historical_fact_checker` and `citation_manager` are enabled for
     the `documentary` workspace type config.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Update the historical_accuracy_check prompt
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_template_id uuid;
  v_next_version integer;
BEGIN
  -- Find the system-level accuracy check template
  SELECT id INTO v_template_id
  FROM prompt_templates
  WHERE prompt_key = 'historical_accuracy_check'
    AND organization_id IS NULL
    AND is_system_default = true
  LIMIT 1;

  IF v_template_id IS NULL THEN
    RAISE NOTICE 'historical_accuracy_check template not found – skipping prompt update';
    RETURN;
  END IF;

  -- Expand workspace_types so documentary and general workspaces get this prompt
  UPDATE prompt_templates
  SET workspace_types = ARRAY['photoreal', 'documentary', 'general']::text[],
      updated_at = now()
  WHERE id = v_template_id;

  -- Determine next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next_version
  FROM prompt_template_versions
  WHERE prompt_template_id = v_template_id;

  -- Un-deploy the current version
  UPDATE prompt_template_versions
  SET is_deployed = false
  WHERE prompt_template_id = v_template_id
    AND is_deployed = true;

  -- Insert updated prompt version with citations_to_create in output schema
  INSERT INTO prompt_template_versions (
    prompt_template_id,
    version_number,
    prompt_content,
    variables_schema,
    created_by,
    change_notes,
    is_deployed
  ) VALUES (
    v_template_id,
    v_next_version,
    E'You are a meticulous historical fact-checker with expertise in {{historical_period}}. You have access to Google Search — use it to verify claims against current sources and retrieve real citations.\n\n## Script to Analyze\n{{script_content}}\n\n## Existing Citations\n{{existing_citations}}\n\n## Your Task\nIdentify and verify ALL verifiable claims in the script. For each claim:\n\n1. **Identify the claim type**:\n   - date: Specific dates, years, timelines\n   - person: Names, identities, roles\n   - event: Historical events, incidents\n   - quote: Direct quotes, attributed statements\n   - statistic: Numbers, quantities, measurements\n   - location: Places, addresses, geography\n   - relationship: Connections between people/entities\n   - causation: Cause and effect claims\n   - fact: Other verifiable facts\n\n2. **Verify against historical record** using web search:\n   - Search for primary sources, encyclopedias, academic references\n   - Check if existing citations support the claim\n   - Identify conflicts with established history\n   - Note the actual URLs you find so they can be added as citations\n\n3. **Assign verification status**:\n   - verified: Claim is accurate and well-supported\n   - needs_citation: Claim appears accurate but needs a source\n   - disputed: Claim conflicts with historical record\n   - unverified: Cannot determine accuracy\n\n4. **Provide confidence score (0-100)**:\n   - 90-100: Highly confident, well-documented fact\n   - 70-89: Reasonably confident, minor details uncertain\n   - 50-69: Moderately confident, needs verification\n   - Below 50: Low confidence, likely needs correction\n\n## Output Format\nReturn ONLY valid JSON (no markdown, no commentary):\n{\n  "overall_assessment": {\n    "confidence_score": number,\n    "total_claims_found": number,\n    "critical_issues": number,\n    "recommendation": "approve|needs_citations|needs_corrections|regenerate"\n  },\n  "claims": [\n    {\n      "claim_text": "The specific claim from the script",\n      "original_context": "Surrounding text for context",\n      "location": {"act": number, "scene": number},\n      "check_type": "date|person|event|quote|statistic|location|fact|relationship|causation",\n      "verification_status": "verified|needs_citation|disputed|unverified",\n      "confidence_score": number,\n      "reasoning": "Explanation of verification result, including what you found via web search",\n      "supporting_citations": ["citation markers that support this"],\n      "suggested_correction": "If disputed, the correct information",\n      "correction_source": "URL or source for the correction",\n      "priority": "critical|high|medium|low"\n    }\n  ],\n  "missing_citations": [\n    {\n      "claim_text": "Claim needing citation",\n      "suggested_source_type": "What type of source would verify this",\n      "search_suggestion": "Specific search query or source to consult"\n    }\n  ],\n  "citations_to_create": [\n    {\n      "source_name": "Name of the source (e.g. National Archives, Wikipedia, Britannica)",\n      "source_type": "website|book|archive|journal|article|newspaper|government_record|primary_document",\n      "citation_text": "Full formatted citation text including title, author if known, date, and URL",\n      "url": "https://actual-url-found-via-search-if-available",\n      "reference_context": "Which claim in the script this citation supports",\n      "is_primary_source": false\n    }\n  ],\n  "regeneration_recommendations": [\n    "Specific improvements if script should be regenerated"\n  ]\n}\n\nIMPORTANT: Populate citations_to_create with every real source you found during web research. These will be automatically added to the script''s citation library. Be thorough — include sources for verified claims, corrections, and disputed facts.\n\nBe thorough but reasonable. Focus on verifiable facts, not interpretations or stylistic choices.',
    '{"historical_period": {"type": "string", "required": true}, "script_content": {"type": "string", "required": true}, "existing_citations": {"type": "string"}}'::jsonb,
    'system',
    'Add citations_to_create output field for auto-citation; add Google Search grounding instruction; expand workspace_types to documentary and general',
    true
  );

  RAISE NOTICE 'Updated historical_accuracy_check prompt to version %', v_next_version;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Ensure documentary workspace has fact checker + citation manager enabled
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE workspace_type_configs
SET features = jsonb_set(
      jsonb_set(features, '{historical_fact_checker}', 'true'),
      '{citation_manager}', 'true'
    ),
    updated_at = now()
WHERE workspace_type = 'documentary'
  AND (
    (features->>'historical_fact_checker')::boolean IS DISTINCT FROM true
    OR (features->>'citation_manager')::boolean IS DISTINCT FROM true
  );

-- Ensure photoreal has both enabled too (may already be set, this is idempotent)
UPDATE workspace_type_configs
SET features = jsonb_set(
      jsonb_set(features, '{historical_fact_checker}', 'true'),
      '{citation_manager}', 'true'
    ),
    updated_at = now()
WHERE workspace_type = 'photoreal'
  AND (
    (features->>'historical_fact_checker')::boolean IS DISTINCT FROM true
    OR (features->>'citation_manager')::boolean IS DISTINCT FROM true
  );
