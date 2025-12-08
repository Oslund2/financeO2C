import { supabase } from '../lib/supabase';

export interface ScriptLockInfo {
  locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
  associated_episodes: Array<{
    id: string;
    title: string;
    status: string;
  }>;
}

export async function lockScript(
  scriptId: string,
  lockedBy: string,
  episodeId: string | null = null,
  reason: string = 'Script locked for production'
): Promise<void> {
  const { error: updateError } = await supabase
    .from('scripts')
    .update({
      locked: true,
      locked_by: lockedBy,
      locked_at: new Date().toISOString(),
      status: 'in_production',
    })
    .eq('id', scriptId);

  if (updateError) throw updateError;

  const { error: auditError } = await supabase
    .from('script_locks')
    .insert([{
      script_id: scriptId,
      episode_id: episodeId,
      locked_by: lockedBy,
      action: 'locked',
      reason,
      locked_at: new Date().toISOString(),
    }]);

  if (auditError) throw auditError;
}

export async function unlockScript(
  scriptId: string,
  unlockedBy: string,
  reason: string = 'Production completed'
): Promise<void> {
  const { data: script } = await supabase
    .from('scripts')
    .select('locked_by, locked_at')
    .eq('id', scriptId)
    .single();

  if (!script) throw new Error('Script not found');

  const { error: updateError } = await supabase
    .from('scripts')
    .update({
      locked: false,
      locked_by: null,
      locked_at: null,
    })
    .eq('id', scriptId);

  if (updateError) throw updateError;

  const { error: auditError } = await supabase
    .from('script_locks')
    .insert([{
      script_id: scriptId,
      locked_by: unlockedBy,
      action: 'unlocked',
      reason,
      locked_at: script.locked_at,
      unlocked_at: new Date().toISOString(),
    }]);

  if (auditError) throw auditError;
}

export async function getScriptLockInfo(scriptId: string): Promise<ScriptLockInfo> {
  const { data: script } = await supabase
    .from('scripts')
    .select('locked, locked_by, locked_at')
    .eq('id', scriptId)
    .single();

  if (!script) throw new Error('Script not found');

  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, title, status')
    .eq('script_id', scriptId)
    .order('created_at', { ascending: true });

  return {
    locked: script.locked || false,
    locked_by: script.locked_by,
    locked_at: script.locked_at,
    associated_episodes: episodes || [],
  };
}

export async function canUserEditScript(
  scriptId: string,
  userId: string,
  isDirector: boolean = false
): Promise<{ canEdit: boolean; reason?: string }> {
  const lockInfo = await getScriptLockInfo(scriptId);

  if (!lockInfo.locked) {
    return { canEdit: true };
  }

  if (isDirector) {
    return {
      canEdit: true,
      reason: 'Director override - script is locked but you have permission to edit',
    };
  }

  return {
    canEdit: false,
    reason: `Script is locked by ${lockInfo.locked_by} for production. Only Directors can edit locked scripts.`,
  };
}

export async function logScriptEdit(
  scriptId: string,
  editedBy: string,
  changesMade: Record<string, unknown>
): Promise<void> {
  const { data: script } = await supabase
    .from('scripts')
    .select('locked, locked_at')
    .eq('id', scriptId)
    .single();

  if (!script || !script.locked) return;

  const { error } = await supabase
    .from('script_locks')
    .insert([{
      script_id: scriptId,
      locked_by: editedBy,
      action: 'edited_while_locked',
      reason: 'Director made changes to locked script',
      locked_at: script.locked_at,
      changes_made: changesMade,
    }]);

  if (error) console.error('Error logging script edit:', error);

  const { data: episodes } = await supabase
    .from('episodes')
    .select('id')
    .eq('script_id', scriptId)
    .neq('status', 'completed');

  if (episodes && episodes.length > 0) {
    const episodeIds = episodes.map(ep => ep.id);
    await supabase
      .from('episodes')
      .update({ sync_status: 'script_modified' })
      .in('id', episodeIds);
  }
}

export async function checkAllEpisodesCompleted(scriptId: string): Promise<boolean> {
  const { data: episodes } = await supabase
    .from('episodes')
    .select('status')
    .eq('script_id', scriptId);

  if (!episodes || episodes.length === 0) return true;

  return episodes.every(ep => ep.status === 'completed');
}

export async function autoUnlockIfAllCompleted(
  scriptId: string,
  unlockedBy: string = 'System'
): Promise<boolean> {
  const allCompleted = await checkAllEpisodesCompleted(scriptId);

  if (allCompleted) {
    await unlockScript(scriptId, unlockedBy, 'All associated episodes completed');
    return true;
  }

  return false;
}
