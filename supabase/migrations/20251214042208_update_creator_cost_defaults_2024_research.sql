/*
  # Update Creator Cost Defaults Based on 2024-2025 Industry Research

  ## Overview
  This migration updates creator (traditional labor) cost defaults to reflect
  current industry salaries and facility costs based on BLS and industry research.

  ## Research Sources
  - BLS Animator Median Salary 2024: $99,800
  - Entry-level animators: $37,000-78,000
  - Senior animators: $80,000-120,000
  - Industry overhead rates: 25-35%
  - Software costs: Adobe CC + specialized tools = $100-200/month
  - Equipment amortization: $200-300/month per artist
  - Studio space varies by location

  ## Changes to Global Default Creator Cost Configuration

  1. Labor Parameters:
    - artist_annual_salary: $75,000 -> $85,000 (closer to median)
    - overhead_percentage: 25% -> 30% (industry standard with benefits)

  2. Production Metrics:
    - scenes_per_episode: 165 -> 150 (more realistic for 22-min episode)
    - time_per_scene_hours: 1.0 -> 1.25 (accounts for complexity)

  3. Facility Costs (Monthly per Artist):
    - software_cost_per_artist_monthly: $100 -> $150 (Adobe CC + tools)
    - equipment_cost_per_artist_monthly: $200 -> $250 (hardware amortization)
    - studio_space_cost_per_artist_monthly: $300 -> $350 (reflects market rates)

  ## Changes to Small Studio Preset
  - artist_annual_salary: $65,000 -> $70,000
  - software_cost_per_artist_monthly: $150 -> $125 (fewer tools)
  - equipment_cost_per_artist_monthly: $150 -> $175
  - studio_space_cost_per_artist_monthly: $200 -> $225

  ## Changes to Large Studio Preset
  - artist_annual_salary: $85,000 -> $95,000 (larger studios pay more)
  - overhead_percentage: 30% -> 35% (more infrastructure)
  - software_cost_per_artist_monthly: $120 -> $175 (enterprise licenses)
  - equipment_cost_per_artist_monthly: $250 -> $300
  - studio_space_cost_per_artist_monthly: $400 -> $450
*/

UPDATE creator_cost_config
SET
  artist_annual_salary = 85000.00,
  overhead_percentage = 30.0,
  scenes_per_episode = 150,
  time_per_scene_hours = 1.25,
  software_cost_per_artist_monthly = 150.00,
  equipment_cost_per_artist_monthly = 250.00,
  studio_space_cost_per_artist_monthly = 350.00,
  updated_at = now()
WHERE series_id IS NULL
  AND config_name = 'Global Default Creator Cost Configuration';

UPDATE creator_cost_config
SET
  artist_annual_salary = 70000.00,
  software_cost_per_artist_monthly = 125.00,
  equipment_cost_per_artist_monthly = 175.00,
  studio_space_cost_per_artist_monthly = 225.00,
  updated_at = now()
WHERE series_id IS NULL
  AND config_name = 'Small Studio Preset';

UPDATE creator_cost_config
SET
  artist_annual_salary = 95000.00,
  overhead_percentage = 35.0,
  software_cost_per_artist_monthly = 175.00,
  equipment_cost_per_artist_monthly = 300.00,
  studio_space_cost_per_artist_monthly = 450.00,
  updated_at = now()
WHERE series_id IS NULL
  AND config_name = 'Large Studio Preset';
