/*
  # Update Production Cost Defaults Based on 2024-2025 Industry Research

  ## Overview
  This migration updates production cost defaults to reflect current industry pricing
  based on comprehensive research of AI service costs and traditional animation rates.

  ## Research Sources
  - ElevenLabs API pricing (voice synthesis): ~$0.30/1000 characters
  - Google Veo 2/3 video generation: $0.35-0.75/second ($21-45/minute)
  - Animation industry standard rates: $3,000-7,000/minute (mid-tier studios)
  - Video editor hourly rates: $45-100/hour (intermediate level)
  - BLS animator median salary 2024: $99,800

  ## Changes to production_cost_config

  1. AI Base Costs (Reduced to reflect cheaper API pricing):
    - cost_per_minute_ai: $50 -> $35 (LLM/prompt generation costs only)
    - cost_per_voice_line: $2.50 -> $0.75 (ElevenLabs is much cheaper)
    - cost_per_character: $75 -> $45 (AI character generation)
    - cost_per_scene: $25 -> $15 (per scene generation)
    - cost_per_act: $100 -> $50 (structural overhead)

  2. Video Generation (Reduced based on Veo 2/3 pricing):
    - video_generation_cost_per_minute: $120 -> $45 (Veo 2 at $0.35-0.50/sec)

  3. Traditional Animation Comparison (Increased for realism):
    - cost_per_minute_traditional: $500 -> $5,000 (mid-tier studio rates)

  4. Complexity Multipliers (Adjusted):
    - complexity_multiplier_simple: 0.80 -> 0.75
    - complexity_multiplier_complex: 1.50 -> 1.75

  5. Human Labor Costs (Adjusted based on 2024 editor rates):
    - human_editing_cost_per_minute: $50 -> $40
    - human_scene_setup_cost_per_minute: $25 -> $18
    - human_character_qc_cost_per_minute: $10 -> $8
    - human_render_supervision_cost_per_minute: $15 -> $12
    - human_voice_direction_cost_per_session: $200 -> $175
    - human_revision_rate_percentage: 20% -> 18%
    - asset_decay_rate: 0.95 -> 0.93
    - asset_decay_floor: 0.40 -> 0.35

  ## Impact Analysis
  For a 24-minute episode:
  - Previous AI estimate: ~$7,000-8,000
  - Updated AI estimate: ~$4,000-5,000
  - Previous traditional comparison: $12,000
  - Updated traditional comparison: $120,000
  - This provides a more realistic 92%+ savings comparison
*/

UPDATE production_cost_config
SET
  cost_per_minute_ai = 35.00,
  cost_per_minute_traditional = 5000.00,
  cost_per_act = 50.00,
  cost_per_scene = 15.00,
  cost_per_character = 45.00,
  cost_per_voice_line = 0.75,
  complexity_multiplier_simple = 0.75,
  complexity_multiplier_complex = 1.75,
  video_generation_cost_per_minute = 45.00,
  human_editing_cost_per_minute = 40.00,
  human_scene_setup_cost_per_minute = 18.00,
  human_character_qc_cost_per_minute = 8.00,
  human_render_supervision_cost_per_minute = 12.00,
  human_voice_direction_cost_per_session = 175.00,
  human_revision_rate_percentage = 18.00,
  asset_decay_rate = 0.930,
  asset_decay_floor = 0.350,
  updated_at = now()
WHERE series_id IS NULL
  AND config_name = 'Global Default Configuration';
