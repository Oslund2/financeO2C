import { supabase } from '../lib/supabase';

export type OperationType =
  | 'script_generation'
  | 'translation'
  | 'prompt_enhancement'
  | 'storyboard_generation'
  | 'dialogue_generation'
  | 'text_generation';

export interface UsageTrackingOptions {
  organizationId?: string;
  operationType: OperationType;
  modelUsed?: string;
  inputText: string;
  outputText?: string;
  success: boolean;
  errorMessage?: string;
  latencyMs?: number;
  metadata?: Record<string, any>;
}

export interface UsageStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  average_latency_ms: number;
  by_operation: Record<string, { count: number; success_rate: number }>;
  by_model: Record<string, number>;
}

export interface DailyUsage {
  date: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  total_tokens: number;
  average_latency: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function trackGeminiUsage(options: UsageTrackingOptions): Promise<void> {
  try {
    const inputTokens = estimateTokens(options.inputText);
    const outputTokens = options.outputText ? estimateTokens(options.outputText) : 0;

    await supabase.from('gemini_api_usage').insert({
      organization_id: options.organizationId || null,
      operation_type: options.operationType,
      model_used: options.modelUsed || 'gemini-2.5-flash',
      input_tokens_estimate: inputTokens,
      output_tokens_estimate: outputTokens,
      success: options.success,
      error_message: options.errorMessage || null,
      latency_ms: options.latencyMs || null,
      metadata: options.metadata || {}
    });
  } catch (error) {
    console.error('Failed to track API usage:', error);
  }
}

export async function getUsageStats(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<UsageStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_gemini_usage_stats', {
      org_id: organizationId,
      start_date: startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: endDate?.toISOString() || new Date().toISOString()
    });

    if (error) throw error;
    return data as UsageStats;
  } catch (error) {
    console.error('Failed to get usage stats:', error);
    return null;
  }
}

export async function getDailyUsage(
  organizationId: string,
  days: number = 30
): Promise<DailyUsage[]> {
  try {
    const { data, error } = await supabase.rpc('get_daily_gemini_usage', {
      org_id: organizationId,
      days
    });

    if (error) throw error;
    return data as DailyUsage[];
  } catch (error) {
    console.error('Failed to get daily usage:', error);
    return [];
  }
}

export async function getTotalUsageForOrganization(
  organizationId: string
): Promise<{ totalRequests: number; totalTokens: number }> {
  try {
    const { data, error } = await supabase
      .from('gemini_api_usage')
      .select('input_tokens_estimate, output_tokens_estimate')
      .eq('organization_id', organizationId);

    if (error) throw error;

    const totalRequests = data?.length || 0;
    const totalTokens = data?.reduce(
      (sum, record) => sum + record.input_tokens_estimate + record.output_tokens_estimate,
      0
    ) || 0;

    return { totalRequests, totalTokens };
  } catch (error) {
    console.error('Failed to get total usage:', error);
    return { totalRequests: 0, totalTokens: 0 };
  }
}
