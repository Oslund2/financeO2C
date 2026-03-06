export interface TargetAudience {
  age_range?: string;
  demographics?: string;
  interests?: string[];
  viewing_context?: string;
  [key: string]: unknown;
}

export interface TargetSubAudience {
  setting?: string;
  primary_character?: string;
  primary_focus?: string;
  narrative_style?: string;
  [key: string]: unknown;
}

export interface WorkspaceMission {
  id: string;
  organization_id: string;
  mission_statement: string;
  target_audience: TargetAudience;
  content_goals: string[];
  brand_voice: string;
  content_guardrails: string;
  visual_rendering_style: string;
  mission_status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface SeriesMission {
  id: string;
  series_id: string;
  workspace_mission_id: string | null;
  sub_mission: string;
  target_sub_audience: TargetSubAudience;
  tone_overrides: string;
  content_focus: string[];
  series_rules: string;
  inherits_workspace_mission: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeatureRecommendation {
  id: string;
  workspace_mission_id: string;
  feature_key: string;
  feature_name: string;
  category: string;
  is_existing_feature: boolean;
  is_enabled: boolean;
  ai_reasoning: string;
  priority_score: number;
  created_at: string;
  updated_at: string;
}

export interface MissionGeneratedPrompt {
  id: string;
  workspace_mission_id: string | null;
  series_mission_id: string | null;
  prompt_category: string;
  prompt_key: string;
  prompt_name: string;
  generated_content: string;
  generation_source: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMissionInsert {
  organization_id: string;
  mission_statement?: string;
  target_audience?: TargetAudience;
  content_goals?: string[];
  brand_voice?: string;
  content_guardrails?: string;
  visual_rendering_style?: string;
  mission_status?: string;
}

export interface WorkspaceMissionUpdate {
  mission_statement?: string;
  target_audience?: TargetAudience;
  content_goals?: string[];
  brand_voice?: string;
  content_guardrails?: string;
  visual_rendering_style?: string;
  mission_status?: string;
}

export interface SeriesMissionInsert {
  series_id: string;
  workspace_mission_id?: string | null;
  sub_mission?: string;
  target_sub_audience?: TargetSubAudience;
  tone_overrides?: string;
  content_focus?: string[];
  series_rules?: string;
  inherits_workspace_mission?: boolean;
}

export interface SeriesMissionUpdate {
  sub_mission?: string;
  target_sub_audience?: TargetSubAudience;
  tone_overrides?: string;
  content_focus?: string[];
  series_rules?: string;
  inherits_workspace_mission?: boolean;
  workspace_mission_id?: string | null;
}

export interface MissionHealthScore {
  total: number;
  filled: number;
  percentage: number;
  missing: string[];
}
