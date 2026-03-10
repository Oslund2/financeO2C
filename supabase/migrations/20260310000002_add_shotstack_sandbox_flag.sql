/*
  # Add shotstack_sandbox flag to assembly_settings

  Allows orgs to target the Shotstack stage/sandbox endpoint (free, watermarked)
  versus the production endpoint. Defaults to false (production).
*/

ALTER TABLE assembly_settings
  ADD COLUMN IF NOT EXISTS shotstack_sandbox boolean NOT NULL DEFAULT false;
