/*
  # Add Deletion Action Types to Audit Log

  This migration updates the audit_log table's action_type check constraint to include
  new deletion-related action types needed for the permanent workspace deletion system.

  ## Changes
  - Drop existing action_type check constraint
  - Add new check constraint with additional action types:
    - schedule_deletion: When deletion is scheduled with grace period
    - cancel_deletion: When scheduled deletion is cancelled
    - permanent_delete: When workspace is permanently deleted
  
  ## Existing Action Types (preserved)
  - create, edit, archive, restore, duplicate, delete
*/

-- Drop the existing check constraint
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_type_check;

-- Add updated check constraint with deletion action types
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_type_check 
  CHECK (action_type IN (
    'create', 
    'edit', 
    'archive', 
    'restore', 
    'duplicate', 
    'delete',
    'schedule_deletion',
    'cancel_deletion',
    'permanent_delete'
  ));

-- Add comment for documentation
COMMENT ON CONSTRAINT audit_log_action_type_check ON audit_log IS 
  'Allowed action types including workspace deletion lifecycle events';
