import { supabase } from '../lib/supabase';
import { citationService, Citation } from './citationService';
import { getActivePrompt } from './promptLibraryService';

export interface AccuracyCheckType {
  id: string;
  label: string;
  description?: string;
  icon_name?: string;
  priority: number;
}

export interface VerificationStatus {
  id: string;
  label: string;
  description?: string;
  color?: string;
  icon_name?: string;
  sort_order: number;
}

export interface AccuracyReport {
  id: string;
  script_id: string;
  organization_id?: string;
  total_claims_checked: number;
  verified_count: number;
  needs_citation_count: number;
  disputed_count: number;
  unverified_count: number;
  overall_confidence_score: number;
  ai_model_used?: string;
  check_duration_seconds?: number;
  status: string;
  error_message?: string;
  recommendations?: string[];
  should_regenerate: boolean;
  regeneration_priority?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
}

export interface AccuracyCheck {
  id: string;
  report_id: string;
  script_id: string;
  organization_id?: string;
  check_type: string;
  checked_item: string;
  original_text?: string;
  location_act?: number;
  location_scene?: number;
  location_line_number?: number;
  verification_status: string;
  ai_confidence_score: number;
  ai_reasoning?: string;
  supporting_citation_ids?: string[];
  suggested_correction?: string;
  correction_source?: string;
  flagged_for_review: boolean;
  reviewer_notes?: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AccuracySummary {
  has_report: boolean;
  report_id?: string;
  overall_score?: number;
  total_claims?: number;
  verified?: number;
  needs_citation?: number;
  disputed?: number;
  unverified?: number;
  should_regenerate?: boolean;
  checked_at?: string;
  status: string;
}

interface AIAccuracyResponse {
  overall_assessment: {
    confidence_score: number;
    total_claims_found: number;
    critical_issues: number;
    recommendation: string;
  };
  claims: Array<{
    claim_text: string;
    original_context?: string;
    location: { act: number; scene: number };
    check_type: string;
    verification_status: string;
    confidence_score: number;
    reasoning: string;
    supporting_citations?: string[];
    suggested_correction?: string;
    correction_source?: string;
    priority: string;
  }>;
  missing_citations: Array<{
    claim_text: string;
    suggested_source_type: string;
    search_suggestion: string;
  }>;
  regeneration_recommendations: string[];
}

async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 16000,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function extractScriptContent(script: Record<string, unknown>): string {
  const acts = script.acts as Array<{
    act_number: number;
    title: string;
    scenes: Array<{
      scene_number: number;
      narration?: string;
      dialogue?: Array<{ character: string; line: string }>;
    }>;
  }>;

  if (!acts) return JSON.stringify(script);

  let content = `Script: ${script.title || 'Untitled'}\n\n`;

  for (const act of acts) {
    content += `\n## Act ${act.act_number}: ${act.title || ''}\n\n`;
    for (const scene of act.scenes || []) {
      content += `### Scene ${scene.scene_number}\n`;
      if (scene.narration) {
        content += `Narration: ${scene.narration}\n`;
      }
      if (scene.dialogue) {
        for (const d of scene.dialogue) {
          content += `${d.character}: "${d.line}"\n`;
        }
      }
      content += '\n';
    }
  }

  return content;
}

function formatCitationsForPrompt(citations: Citation[]): string {
  if (citations.length === 0) return 'No existing citations provided.';

  return citations
    .map(
      (c) =>
        `[${c.citation_number}] ${c.source_name} (${c.source_type}): ${c.citation_text}` +
        (c.reference_context ? ` - Context: ${c.reference_context}` : '')
    )
    .join('\n');
}

export const accuracyCheckService = {
  async getCheckTypes(): Promise<AccuracyCheckType[]> {
    const { data, error } = await supabase
      .from('accuracy_check_types')
      .select('*')
      .order('priority');

    if (error) throw error;
    return data || [];
  },

  async getVerificationStatuses(): Promise<VerificationStatus[]> {
    const { data, error } = await supabase
      .from('verification_statuses')
      .select('*')
      .order('sort_order');

    if (error) throw error;
    return data || [];
  },

  async getAccuracySummary(scriptId: string): Promise<AccuracySummary> {
    const { data, error } = await supabase.rpc('get_script_accuracy_summary', {
      p_script_id: scriptId,
    });

    if (error) throw error;
    return data || { has_report: false, status: 'not_checked' };
  },

  async getLatestReport(scriptId: string): Promise<AccuracyReport | null> {
    const { data, error } = await supabase
      .from('script_accuracy_reports')
      .select('*')
      .eq('script_id', scriptId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getReportChecks(reportId: string): Promise<AccuracyCheck[]> {
    const { data, error } = await supabase
      .from('script_accuracy_checks')
      .select('*')
      .eq('report_id', reportId)
      .order('ai_confidence_score', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getUnresolvedIssues(scriptId: string): Promise<{
    disputed: number;
    needs_citation: number;
    flagged: number;
    total: number;
  }> {
    const { data, error } = await supabase.rpc('count_unresolved_accuracy_issues', {
      p_script_id: scriptId,
    });

    if (error) throw error;
    return data || { disputed: 0, needs_citation: 0, flagged: 0, total: 0 };
  },

  async performAccuracyCheck(
    scriptId: string,
    organizationId: string | undefined,
    scriptContent: Record<string, unknown>,
    historicalPeriod: string
  ): Promise<AccuracyReport> {
    const startTime = Date.now();

    const { data: report, error: reportError } = await supabase
      .from('script_accuracy_reports')
      .insert({
        script_id: scriptId,
        organization_id: organizationId,
        status: 'running',
        ai_model_used: 'gemini-2.0-flash',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (reportError) throw reportError;

    try {
      const citations = await citationService.getScriptCitations(scriptId);
      const promptContent = await getActivePrompt(
        organizationId || '',
        'historical_accuracy_check'
      );

      let finalPromptContent =
        promptContent ||
        `Analyze this script for historical accuracy. Return JSON with claims analysis.`;

      const scriptText = extractScriptContent(scriptContent);
      const citationsText = formatCitationsForPrompt(citations);

      finalPromptContent = finalPromptContent
        .replace('{{historical_period}}', historicalPeriod || 'General history')
        .replace('{{script_content}}', scriptText)
        .replace('{{existing_citations}}', citationsText);

      const aiResponse = await callGeminiAPI(finalPromptContent);

      let jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/);
      let jsonString = jsonMatch ? jsonMatch[1] : aiResponse;

      const jsonStart = jsonString.indexOf('{');
      const jsonEnd = jsonString.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonString = jsonString.slice(jsonStart, jsonEnd + 1);
      }

      const parsed: AIAccuracyResponse = JSON.parse(jsonString);
      const checksToInsert = parsed.claims.map((claim) => ({
        report_id: report.id,
        script_id: scriptId,
        organization_id: organizationId,
        check_type: claim.check_type,
        checked_item: claim.claim_text,
        original_text: claim.original_context,
        location_act: claim.location?.act,
        location_scene: claim.location?.scene,
        verification_status: claim.verification_status,
        ai_confidence_score: claim.confidence_score,
        ai_reasoning: claim.reasoning,
        suggested_correction: claim.suggested_correction,
        correction_source: claim.correction_source,
        flagged_for_review:
          claim.verification_status === 'disputed' || claim.priority === 'critical',
        resolved: false,
      }));

      if (checksToInsert.length > 0) {
        const { error: checksError } = await supabase
          .from('script_accuracy_checks')
          .insert(checksToInsert);

        if (checksError) throw checksError;
      }

      const verifiedCount = parsed.claims.filter(
        (c) => c.verification_status === 'verified'
      ).length;
      const needsCitationCount = parsed.claims.filter(
        (c) => c.verification_status === 'needs_citation'
      ).length;
      const disputedCount = parsed.claims.filter(
        (c) => c.verification_status === 'disputed'
      ).length;
      const unverifiedCount = parsed.claims.filter(
        (c) => c.verification_status === 'unverified'
      ).length;

      const shouldRegenerate =
        parsed.overall_assessment.recommendation === 'regenerate' ||
        parsed.overall_assessment.recommendation === 'needs_corrections' ||
        disputedCount > 0;

      const { data: updatedReport, error: updateError } = await supabase
        .from('script_accuracy_reports')
        .update({
          status: 'completed',
          total_claims_checked: parsed.overall_assessment.total_claims_found,
          verified_count: verifiedCount,
          needs_citation_count: needsCitationCount,
          disputed_count: disputedCount,
          unverified_count: unverifiedCount,
          overall_confidence_score: parsed.overall_assessment.confidence_score,
          recommendations: parsed.regeneration_recommendations,
          should_regenerate: shouldRegenerate,
          regeneration_priority:
            disputedCount > 0
              ? 'high'
              : needsCitationCount > 3
                ? 'medium'
                : 'low',
          check_duration_seconds: Math.round((Date.now() - startTime) / 1000),
          completed_at: new Date().toISOString(),
        })
        .eq('id', report.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return updatedReport;
    } catch (error) {
      await supabase
        .from('script_accuracy_reports')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          check_duration_seconds: Math.round((Date.now() - startTime) / 1000),
          completed_at: new Date().toISOString(),
        })
        .eq('id', report.id);

      throw error;
    }
  },

  async resolveCheck(checkId: string, notes?: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('resolve_accuracy_check', {
      p_check_id: checkId,
      p_notes: notes,
    });

    if (error) throw error;
    return data;
  },

  async updateCheckStatus(
    checkId: string,
    status: string,
    notes?: string
  ): Promise<AccuracyCheck> {
    const { data, error } = await supabase
      .from('script_accuracy_checks')
      .update({
        verification_status: status,
        reviewer_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', checkId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async flagForReview(checkId: string, flagged: boolean): Promise<AccuracyCheck> {
    const { data, error } = await supabase
      .from('script_accuracy_checks')
      .update({
        flagged_for_review: flagged,
        updated_at: new Date().toISOString(),
      })
      .eq('id', checkId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async linkCitationToCheck(checkId: string, citationId: string): Promise<void> {
    const { data: check, error: fetchError } = await supabase
      .from('script_accuracy_checks')
      .select('supporting_citation_ids')
      .eq('id', checkId)
      .single();

    if (fetchError) throw fetchError;

    const existingIds = check.supporting_citation_ids || [];
    if (!existingIds.includes(citationId)) {
      const { error: updateError } = await supabase
        .from('script_accuracy_checks')
        .update({
          supporting_citation_ids: [...existingIds, citationId],
          updated_at: new Date().toISOString(),
        })
        .eq('id', checkId);

      if (updateError) throw updateError;
    }
  },

  getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      verified: 'green',
      needs_citation: 'yellow',
      unverified: 'gray',
      disputed: 'red',
      corrected: 'blue',
    };
    return colorMap[status] || 'gray';
  },

  getStatusIcon(status: string): string {
    const iconMap: Record<string, string> = {
      verified: 'check-circle',
      needs_citation: 'alert-circle',
      unverified: 'help-circle',
      disputed: 'x-circle',
      corrected: 'refresh-cw',
    };
    return iconMap[status] || 'circle';
  },

  getCheckTypeIcon(checkType: string): string {
    const iconMap: Record<string, string> = {
      date: 'calendar',
      person: 'user',
      event: 'flag',
      quote: 'quote',
      statistic: 'bar-chart',
      location: 'map-pin',
      fact: 'check-circle',
      relationship: 'users',
      causation: 'git-branch',
    };
    return iconMap[checkType] || 'file';
  },

  calculateConfidenceLevel(score: number): {
    level: string;
    color: string;
    description: string;
  } {
    if (score >= 90) {
      return {
        level: 'High',
        color: 'green',
        description: 'Well-documented historical fact',
      };
    }
    if (score >= 70) {
      return {
        level: 'Good',
        color: 'emerald',
        description: 'Reasonably confident, minor details may vary',
      };
    }
    if (score >= 50) {
      return {
        level: 'Moderate',
        color: 'yellow',
        description: 'Needs additional verification',
      };
    }
    return {
      level: 'Low',
      color: 'red',
      description: 'Likely needs correction or additional sources',
    };
  },
};
