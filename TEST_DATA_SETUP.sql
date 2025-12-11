-- Optional: Test Data Setup for Organization Switcher
-- Run this SQL in your Supabase SQL Editor to create test organizations

-- This is for TESTING ONLY - In production, organizations would be created through the app

-- 1. First, create test organizations
INSERT INTO organizations (name, slug, billing_tier, subdomain, primary_color, max_brands, max_episodes_per_month) VALUES
  ('Acme Animation Studio', 'acme-animation', 'professional', 'acme', '#3B82F6', 10, 50),
  ('Blue Sky Productions', 'blue-sky-prod', 'enterprise', 'bluesky', '#0EA5E9', 50, 200),
  ('Creative Labs', 'creative-labs', 'starter', 'creative', '#10B981', 5, 20),
  ('Indie Animators Co.', 'indie-animators', 'free', 'indie', '#8B5CF6', 3, 10)
ON CONFLICT (slug) DO NOTHING;

-- 2. After creating a user through Supabase Auth, get their user ID and run this:
-- (Replace YOUR_USER_ID_HERE with your actual user ID from the Supabase Auth dashboard)

/*
INSERT INTO organization_members (organization_id, user_id, role) VALUES
  ((SELECT id FROM organizations WHERE slug = 'acme-animation'), 'YOUR_USER_ID_HERE', 'owner'),
  ((SELECT id FROM organizations WHERE slug = 'blue-sky-prod'), 'YOUR_USER_ID_HERE', 'admin'),
  ((SELECT id FROM organizations WHERE slug = 'creative-labs'), 'YOUR_USER_ID_HERE', 'member'),
  ((SELECT id FROM organizations WHERE slug = 'indie-animators'), 'YOUR_USER_ID_HERE', 'viewer')
ON CONFLICT (organization_id, user_id) DO NOTHING;
*/

-- 3. Verify the setup
SELECT
  o.name as organization_name,
  o.billing_tier,
  om.role,
  om.user_id
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
ORDER BY o.name;

-- Note: The easiest way to test is to:
-- 1. Start the dev server
-- 2. The app will show you a "No Organization Found" screen
-- 3. Use the "Create Test Organization" button to create organizations
-- 4. Once you create 2-3 organizations, the switcher will appear in the sidebar
