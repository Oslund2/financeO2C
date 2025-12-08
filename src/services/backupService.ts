import { supabase } from '../lib/supabase';

export interface BackupSchedule {
  id: string;
  schedule_name: string;
  schedule_type: 'full' | 'incremental' | 'storage_only' | 'database_only';
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  last_run_at?: string;
  next_run_at?: string;
  retention_days: number;
  configuration: Record<string, unknown>;
}

export interface RecoveryPoint {
  id: string;
  point_name: string;
  description?: string;
  created_by?: string;
  snapshot_data: Record<string, unknown>;
  storage_snapshot: Record<string, unknown>;
  status: 'valid' | 'invalid' | 'expired';
  expires_at?: string;
  created_at: string;
}

export interface IntegrityCheck {
  id: string;
  check_type: string;
  target_table?: string;
  target_record_id?: string;
  status: 'passed' | 'failed' | 'warning';
  issues_found: Array<Record<string, unknown>>;
  check_details: Record<string, unknown>;
  checked_at: string;
}

export interface VersionHistory {
  id: string;
  version_number: number;
  snapshot_data: Record<string, unknown>;
  change_summary?: string;
  changed_by?: string;
  changed_at: string;
  is_current: boolean;
}

export const backupService = {
  async createRecoveryPoint(pointName: string, description?: string): Promise<string> {
    const { data, error } = await supabase.rpc('create_recovery_point', {
      point_name: pointName,
      description: description || null
    });

    if (error) throw error;
    return data;
  },

  async listRecoveryPoints(): Promise<RecoveryPoint[]> {
    const { data, error } = await supabase
      .from('recovery_points')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getRecoveryPoint(id: string): Promise<RecoveryPoint | null> {
    const { data, error } = await supabase
      .from('recovery_points')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async deleteRecoveryPoint(id: string): Promise<void> {
    const { error } = await supabase
      .from('recovery_points')
      .update({ status: 'expired' })
      .eq('id', id);

    if (error) throw error;
  },

  async runIntegrityCheck(): Promise<void> {
    const { error } = await supabase.rpc('check_data_integrity');
    if (error) throw error;
  },

  async getIntegrityChecks(limit: number = 50): Promise<IntegrityCheck[]> {
    const { data, error } = await supabase
      .from('data_integrity_checks')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getLatestIntegrityCheck(): Promise<IntegrityCheck | null> {
    const { data, error } = await supabase
      .from('data_integrity_checks')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getBackupSchedules(): Promise<BackupSchedule[]> {
    const { data, error } = await supabase
      .from('backup_schedules')
      .select('*')
      .order('schedule_name');

    if (error) throw error;
    return data || [];
  },

  async updateBackupSchedule(
    id: string,
    updates: Partial<BackupSchedule>
  ): Promise<void> {
    const { error } = await supabase
      .from('backup_schedules')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  },

  async getCharacterHistory(characterId: string): Promise<VersionHistory[]> {
    const { data, error } = await supabase
      .from('characters_history')
      .select('*')
      .eq('character_id', characterId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getAssetHistory(assetId: string): Promise<VersionHistory[]> {
    const { data, error } = await supabase
      .from('assets_history')
      .select('*')
      .eq('asset_id', assetId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getScriptHistory(scriptId: string): Promise<VersionHistory[]> {
    const { data, error } = await supabase
      .from('scripts_history')
      .select('*')
      .eq('script_id', scriptId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getAuditLog(
    tableName?: string,
    recordId?: string,
    limit: number = 100
  ): Promise<Array<{
    id: string;
    table_name: string;
    record_id: string;
    operation: string;
    old_data?: Record<string, unknown>;
    new_data?: Record<string, unknown>;
    changed_by?: string;
    changed_at: string;
    change_description?: string;
  }>> {
    let query = supabase
      .from('data_audit_log')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (tableName) {
      query = query.eq('table_name', tableName);
    }

    if (recordId) {
      query = query.eq('record_id', recordId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async restoreCharacterVersion(
    characterId: string,
    versionNumber: number
  ): Promise<void> {
    const history = await this.getCharacterHistory(characterId);
    const version = history.find(v => v.version_number === versionNumber);

    if (!version) {
      throw new Error(`Version ${versionNumber} not found for character ${characterId}`);
    }

    const { snapshot_data } = version;
    const { error } = await supabase
      .from('characters')
      .update(snapshot_data)
      .eq('id', characterId);

    if (error) throw error;
  },

  async restoreAssetVersion(
    assetId: string,
    versionNumber: number
  ): Promise<void> {
    const history = await this.getAssetHistory(assetId);
    const version = history.find(v => v.version_number === versionNumber);

    if (!version) {
      throw new Error(`Version ${versionNumber} not found for asset ${assetId}`);
    }

    const { snapshot_data } = version;
    const { error } = await supabase
      .from('assets')
      .update(snapshot_data)
      .eq('id', assetId);

    if (error) throw error;
  },

  async restoreScriptVersion(
    scriptId: string,
    versionNumber: number
  ): Promise<void> {
    const history = await this.getScriptHistory(scriptId);
    const version = history.find(v => v.version_number === versionNumber);

    if (!version) {
      throw new Error(`Version ${versionNumber} not found for script ${scriptId}`);
    }

    const { snapshot_data } = version;
    const { error } = await supabase
      .from('scripts')
      .update(snapshot_data)
      .eq('id', scriptId);

    if (error) throw error;
  },

  async backupStorageFile(
    bucketId: string,
    filePath: string
  ): Promise<void> {
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from(bucketId)
      .download(filePath);

    if (downloadError) throw downloadError;

    const timestamp = Date.now();
    const backupPath = `backups/${filePath}_${timestamp}`;

    const { error: uploadError } = await supabase
      .storage
      .from(bucketId)
      .upload(backupPath, fileData, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: metadata } = await supabase
      .storage
      .from(bucketId)
      .list(filePath.split('/').slice(0, -1).join('/'));

    const fileInfo = metadata?.find(f => f.name === filePath.split('/').pop());

    const { error: logError } = await supabase
      .from('storage_file_backups')
      .insert({
        original_bucket_id: bucketId,
        original_file_path: filePath,
        backup_file_path: backupPath,
        file_size: fileInfo?.metadata?.size || 0,
        file_metadata: fileInfo?.metadata || {},
        backup_status: 'active'
      });

    if (logError) throw logError;
  }
};
