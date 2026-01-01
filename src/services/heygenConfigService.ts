import { supabase } from '../lib/supabase';

export interface HeyGenLanguage {
  code: string;
  name: string;
  region?: string;
}

export const HEYGEN_SUPPORTED_LANGUAGES: HeyGenLanguage[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'te', name: 'Telugu' },
  { code: 'mr', name: 'Marathi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'ur', name: 'Urdu' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
  { code: 'fil', name: 'Filipino' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'cs', name: 'Czech' },
  { code: 'ro', name: 'Romanian' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'el', name: 'Greek' },
  { code: 'he', name: 'Hebrew' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'hr', name: 'Croatian' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'lv', name: 'Latvian' },
  { code: 'et', name: 'Estonian' },
  { code: 'fa', name: 'Persian' },
  { code: 'sw', name: 'Swahili' },
  { code: 'af', name: 'Afrikaans' },
];

export interface HeyGenUsageStats {
  minutesUsedThisMonth: number;
  monthlyQuotaMinutes?: number;
  percentageUsed: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalCost: number;
}

class HeyGenConfigService {
  async getUsageStats(organizationId: string): Promise<HeyGenUsageStats> {
    const { data: config } = await supabase
      .from('heygen_provider_configs')
      .select('minutes_used_this_month, monthly_quota_minutes')
      .eq('organization_id', organizationId)
      .maybeSingle();

    const { data: jobs } = await supabase
      .from('video_translation_jobs')
      .select('status, actual_cost_usd')
      .eq('organization_id', organizationId);

    const minutesUsed = config?.minutes_used_this_month || 0;
    const quota = config?.monthly_quota_minutes;
    const percentageUsed = quota ? (minutesUsed / quota) * 100 : 0;

    const totalJobs = jobs?.length || 0;
    const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0;
    const failedJobs = jobs?.filter(j => j.status === 'failed').length || 0;
    const totalCost = jobs?.reduce((sum, j) => sum + parseFloat(j.actual_cost_usd || '0'), 0) || 0;

    return {
      minutesUsedThisMonth: minutesUsed,
      monthlyQuotaMinutes: quota,
      percentageUsed,
      totalJobs,
      completedJobs,
      failedJobs,
      totalCost,
    };
  }

  async resetMonthlyUsage(organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('heygen_provider_configs')
      .update({ minutes_used_this_month: 0 })
      .eq('organization_id', organizationId);

    if (error) throw error;
  }

  getLanguageByCode(code: string): HeyGenLanguage | undefined {
    return HEYGEN_SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  }

  getLanguagesByRegion(region: string): HeyGenLanguage[] {
    return HEYGEN_SUPPORTED_LANGUAGES.filter(lang => lang.region === region);
  }

  searchLanguages(query: string): HeyGenLanguage[] {
    const lowerQuery = query.toLowerCase();
    return HEYGEN_SUPPORTED_LANGUAGES.filter(
      lang =>
        lang.name.toLowerCase().includes(lowerQuery) ||
        lang.code.toLowerCase().includes(lowerQuery)
    );
  }

  validateApiKey(apiKey: string): boolean {
    return apiKey.length > 0 && !apiKey.includes(' ');
  }

  getMostPopularLanguages(): HeyGenLanguage[] {
    return [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'zh', name: 'Chinese (Simplified)' },
      { code: 'hi', name: 'Hindi' },
      { code: 'ar', name: 'Arabic' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'bn', name: 'Bengali' },
      { code: 'ru', name: 'Russian' },
      { code: 'ja', name: 'Japanese' },
      { code: 'pa', name: 'Punjabi' },
      { code: 'de', name: 'German' },
      { code: 'ko', name: 'Korean' },
      { code: 'fr', name: 'French' },
      { code: 'tr', name: 'Turkish' },
      { code: 'it', name: 'Italian' },
    ];
  }
}

export const heygenConfigService = new HeyGenConfigService();
