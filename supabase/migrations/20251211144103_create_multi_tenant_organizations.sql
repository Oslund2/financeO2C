/*
  # Multi-Tenant Organization System

  1. New Tables
    - `organizations`
      - Organization/tenant management
      - Subdomain and custom domain support
      - Billing tier and usage quotas
      - Enterprise features (SSO, custom branding)
    
    - `organization_members`
      - User membership in organizations
      - Role-based permissions (owner, admin, member, viewer)
      - Invitation and access management
    
    - `organization_invitations`
      - Pending invitations to join organizations
      - Email-based invitation system
      - Expiration tracking
    
    - `organization_usage`
      - Track resource usage per organization
      - AI generation costs, storage, API calls
      - Monthly usage tracking for billing
    
    - `organization_domains`
      - Custom domain management per organization
      - SSL certificate status
      - Domain verification

  2. Schema Changes
    - Add `organization_id` to existing tables (series, episodes, characters, etc.)
    - Maintain backward compatibility with null organization_id
    
  3. Security
    - Enable RLS on all new tables
    - Organization-scoped data access policies
    - Member role-based permissions
    - Secure invitation system

  4. Features
    - Multi-brand portfolio management
    - Team collaboration within organizations
    - Usage quotas and billing tracking
    - White-label subdomain support
    - Enterprise authentication ready
*/

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  subdomain text UNIQUE,
  logo_url text,
  primary_color text DEFAULT '#3B82F6',
  billing_tier text DEFAULT 'free' CHECK (billing_tier IN ('free', 'starter', 'professional', 'enterprise')),
  
  -- Usage quotas based on billing tier
  max_brands int DEFAULT 3,
  max_episodes_per_month int DEFAULT 10,
  max_storage_gb int DEFAULT 5,
  max_ai_generation_monthly_cost decimal DEFAULT 100.00,
  max_team_members int DEFAULT 5,
  
  -- Enterprise features
  sso_enabled boolean DEFAULT false,
  custom_domain_enabled boolean DEFAULT false,
  api_access_enabled boolean DEFAULT false,
  white_label_enabled boolean DEFAULT false,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  settings jsonb DEFAULT '{}'::jsonb
);

-- Create organization members table
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  
  -- Permissions can be customized per member
  permissions jsonb DEFAULT '{
    "brands": {"create": true, "edit": true, "delete": false, "view": true},
    "episodes": {"create": true, "edit": true, "delete": false, "view": true},
    "assets": {"upload": true, "edit": true, "delete": false, "view": true},
    "settings": {"view": false, "edit": false},
    "billing": {"view": false, "edit": false},
    "team": {"invite": false, "manage": false}
  }'::jsonb,
  
  joined_at timestamptz DEFAULT now(),
  invited_by uuid,
  
  UNIQUE(organization_id, user_id)
);

-- Create organization invitations table
CREATE TABLE IF NOT EXISTS organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by uuid NOT NULL,
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, email)
);

-- Create organization usage tracking table
CREATE TABLE IF NOT EXISTS organization_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month date NOT NULL,
  
  -- Usage metrics
  episodes_created int DEFAULT 0,
  ai_generations int DEFAULT 0,
  ai_cost_usd decimal DEFAULT 0.00,
  storage_used_gb decimal DEFAULT 0.00,
  api_calls int DEFAULT 0,
  active_brands int DEFAULT 0,
  active_team_members int DEFAULT 0,
  
  -- Detailed breakdown
  image_generations int DEFAULT 0,
  voice_generations int DEFAULT 0,
  video_generations int DEFAULT 0,
  script_generations int DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, month)
);

-- Create organization custom domains table
CREATE TABLE IF NOT EXISTS organization_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain text UNIQUE NOT NULL,
  is_verified boolean DEFAULT false,
  verification_token text DEFAULT gen_random_uuid()::text,
  ssl_status text DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'active', 'failed')),
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  
  UNIQUE(organization_id, domain)
);

-- Add organization_id to existing tables
DO $$
BEGIN
  -- Add to series table (brands)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'series' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE series ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_series_organization ON series(organization_id);
  END IF;

  -- Add to episodes table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'episodes' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE episodes ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_episodes_organization ON episodes(organization_id);
  END IF;

  -- Add to characters table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'characters' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE characters ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_characters_organization ON characters(organization_id);
  END IF;

  -- Add to assets table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE assets ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_assets_organization ON assets(organization_id);
  END IF;

  -- Add to storyboards table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'storyboards' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE storyboards ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_storyboards_organization ON storyboards(organization_id);
  END IF;

  -- Add to scripts table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scripts' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE scripts ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_scripts_organization ON scripts(organization_id);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_organization_usage_month ON organization_usage(organization_id, month);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_domains ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view organizations they are members of"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization owners and admins can update organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- RLS Policies for organization_members
CREATE POLICY "Organization members can view other members"
  ON organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization owners and admins can manage members"
  ON organization_members FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for organization_invitations
CREATE POLICY "Organization members can view invitations"
  ON organization_invitations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization owners and admins can manage invitations"
  ON organization_invitations FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for organization_usage
CREATE POLICY "Organization members can view usage"
  ON organization_usage FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for organization_domains
CREATE POLICY "Organization members can view domains"
  ON organization_domains FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization owners and admins can manage domains"
  ON organization_domains FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Update existing table policies to respect organization boundaries
-- Series (Brands) policies
DROP POLICY IF EXISTS "Anyone can view shows" ON series;
DROP POLICY IF EXISTS "Anyone can create shows" ON series;
DROP POLICY IF EXISTS "Anyone can update shows" ON series;
DROP POLICY IF EXISTS "Anyone can delete shows" ON series;

CREATE POLICY "Users can view organization series"
  ON series FOR SELECT
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage organization series"
  ON series FOR ALL
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Helper function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid uuid)
RETURNS TABLE(organization_id uuid, role text) AS $$
BEGIN
  RETURN QUERY
  SELECT om.organization_id, om.role
  FROM organization_members om
  WHERE om.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check organization membership
CREATE OR REPLACE FUNCTION is_organization_member(org_id uuid, user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check organization role
CREATE OR REPLACE FUNCTION has_organization_role(org_id uuid, user_uuid uuid, required_role text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id 
    AND user_id = user_uuid 
    AND role = ANY(required_role)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update organization usage
CREATE OR REPLACE FUNCTION update_organization_usage(
  org_id uuid,
  metric_type text,
  amount decimal DEFAULT 1
) RETURNS void AS $$
DECLARE
  current_month date := date_trunc('month', now());
BEGIN
  INSERT INTO organization_usage (organization_id, month)
  VALUES (org_id, current_month)
  ON CONFLICT (organization_id, month) DO NOTHING;
  
  CASE metric_type
    WHEN 'episode' THEN
      UPDATE organization_usage 
      SET episodes_created = episodes_created + amount::int, updated_at = now()
      WHERE organization_id = org_id AND month = current_month;
    WHEN 'ai_generation' THEN
      UPDATE organization_usage 
      SET ai_generations = ai_generations + amount::int, updated_at = now()
      WHERE organization_id = org_id AND month = current_month;
    WHEN 'ai_cost' THEN
      UPDATE organization_usage 
      SET ai_cost_usd = ai_cost_usd + amount, updated_at = now()
      WHERE organization_id = org_id AND month = current_month;
    WHEN 'image_generation' THEN
      UPDATE organization_usage 
      SET image_generations = image_generations + amount::int, 
          ai_generations = ai_generations + amount::int,
          updated_at = now()
      WHERE organization_id = org_id AND month = current_month;
    WHEN 'voice_generation' THEN
      UPDATE organization_usage 
      SET voice_generations = voice_generations + amount::int,
          ai_generations = ai_generations + amount::int,
          updated_at = now()
      WHERE organization_id = org_id AND month = current_month;
    WHEN 'video_generation' THEN
      UPDATE organization_usage 
      SET video_generations = video_generations + amount::int,
          ai_generations = ai_generations + amount::int,
          updated_at = now()
      WHERE organization_id = org_id AND month = current_month;
    WHEN 'script_generation' THEN
      UPDATE organization_usage 
      SET script_generations = script_generations + amount::int,
          ai_generations = ai_generations + amount::int,
          updated_at = now()
      WHERE organization_id = org_id AND month = current_month;
    WHEN 'api_call' THEN
      UPDATE organization_usage 
      SET api_calls = api_calls + amount::int, updated_at = now()
      WHERE organization_id = org_id AND month = current_month;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;