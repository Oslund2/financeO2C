import { supabase } from '../lib/supabase';
import { backupService } from './backupService';

export interface MonitoringAlert {
  id: string;
  alert_type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  details?: Record<string, unknown>;
  resolved: boolean;
  created_at: string;
  resolved_at?: string;
}

export interface SystemHealth {
  overall_status: 'healthy' | 'warning' | 'critical';
  last_check: string;
  checks: {
    database: 'healthy' | 'warning' | 'critical';
    storage: 'healthy' | 'warning' | 'critical';
    backups: 'healthy' | 'warning' | 'critical';
  };
  statistics: {
    total_characters: number;
    total_assets: number;
    total_scripts: number;
    storage_files: number;
    recent_backups: number;
    failed_integrity_checks: number;
  };
}

class MonitoringService {
  private checkInterval: NodeJS.Timeout | null = null;
  private alerts: MonitoringAlert[] = [];

  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const [
        charactersCount,
        assetsCount,
        scriptsCount,
        latestIntegrityCheck,
        recentBackups
      ] = await Promise.all([
        supabase.from('characters').select('id', { count: 'exact', head: true }),
        supabase.from('assets').select('id', { count: 'exact', head: true }),
        supabase.from('scripts').select('id', { count: 'exact', head: true }),
        backupService.getLatestIntegrityCheck(),
        supabase
          .from('recovery_points')
          .select('id')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      const storageFiles = await supabase.storage.from('character-images').list('characters');
      const storageCount = { count: storageFiles.data?.length || 0, error: storageFiles.error };

      const failedChecks = await supabase
        .from('data_integrity_checks')
        .select('id')
        .eq('status', 'failed')
        .gte('checked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      let databaseStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      let storageStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      let backupStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

      if (latestIntegrityCheck?.status === 'failed') {
        databaseStatus = 'critical';
      } else if (latestIntegrityCheck?.status === 'warning') {
        databaseStatus = 'warning';
      }

      if (!latestIntegrityCheck ||
          new Date(latestIntegrityCheck.checked_at).getTime() < Date.now() - 24 * 60 * 60 * 1000) {
        databaseStatus = 'warning';
      }

      if ((recentBackups.data?.length || 0) === 0) {
        backupStatus = 'warning';
      }

      if ((storageCount.count || 0) === 0 && (charactersCount.count || 0) > 0) {
        storageStatus = 'warning';
      }

      const overallStatus =
        databaseStatus === 'critical' || storageStatus === 'critical' || backupStatus === 'critical'
          ? 'critical'
          : databaseStatus === 'warning' || storageStatus === 'warning' || backupStatus === 'warning'
          ? 'warning'
          : 'healthy';

      return {
        overall_status: overallStatus,
        last_check: new Date().toISOString(),
        checks: {
          database: databaseStatus,
          storage: storageStatus,
          backups: backupStatus
        },
        statistics: {
          total_characters: charactersCount.count || 0,
          total_assets: assetsCount.count || 0,
          total_scripts: scriptsCount.count || 0,
          storage_files: storageCount.count || 0,
          recent_backups: recentBackups.data?.length || 0,
          failed_integrity_checks: failedChecks.data?.length || 0
        }
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        overall_status: 'critical',
        last_check: new Date().toISOString(),
        checks: {
          database: 'critical',
          storage: 'critical',
          backups: 'critical'
        },
        statistics: {
          total_characters: 0,
          total_assets: 0,
          total_scripts: 0,
          storage_files: 0,
          recent_backups: 0,
          failed_integrity_checks: 0
        }
      };
    }
  }

  async checkForOrphanedData(): Promise<{
    orphanedAssets: number;
    missingStorageFiles: number;
  }> {
    const { data: orphanedAssets } = await supabase
      .from('assets')
      .select('id')
      .not('character_id', 'is', null)
      .is('character_id', null);

    const { data: charactersWithImages } = await supabase
      .from('characters')
      .select('id, reference_image_url')
      .not('reference_image_url', 'is', null);

    let missingFiles = 0;
    if (charactersWithImages) {
      for (const char of charactersWithImages) {
        if (char.reference_image_url) {
          const fileName = char.reference_image_url.split('/').pop();
          const { data } = await supabase
            .storage
            .from('character-images')
            .list('characters', {
              search: fileName
            });

          if (!data || data.length === 0) {
            missingFiles++;
          }
        }
      }
    }

    return {
      orphanedAssets: orphanedAssets?.length || 0,
      missingStorageFiles: missingFiles
    };
  }

  async runScheduledChecks(): Promise<void> {
    try {
      await backupService.runIntegrityCheck();

      const health = await this.getSystemHealth();

      if (health.overall_status === 'critical') {
        console.error('CRITICAL: System health check failed', health);
      } else if (health.overall_status === 'warning') {
        console.warn('WARNING: System health check found issues', health);
      }

      const orphanedData = await this.checkForOrphanedData();
      if (orphanedData.orphanedAssets > 0 || orphanedData.missingStorageFiles > 0) {
        console.warn('Data integrity issues found:', orphanedData);
      }
    } catch (error) {
      console.error('Error running scheduled checks:', error);
    }
  }

  startMonitoring(intervalMinutes: number = 60): void {
    if (this.checkInterval) {
      this.stopMonitoring();
    }

    this.runScheduledChecks();

    this.checkInterval = setInterval(() => {
      this.runScheduledChecks();
    }, intervalMinutes * 60 * 1000);

    console.log(`Monitoring started with ${intervalMinutes} minute interval`);
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Monitoring stopped');
    }
  }

  async createManualBackup(name: string, description?: string): Promise<string> {
    try {
      const recoveryPointId = await backupService.createRecoveryPoint(name, description);

      const { data: storageFiles } = await supabase
        .storage
        .from('character-images')
        .list('characters');

      if (storageFiles) {
        const backupPromises = storageFiles.map(file =>
          backupService.backupStorageFile('character-images', `characters/${file.name}`)
            .catch(err => console.error(`Failed to backup ${file.name}:`, err))
        );

        await Promise.all(backupPromises);
      }

      return recoveryPointId;
    } catch (error) {
      console.error('Error creating manual backup:', error);
      throw error;
    }
  }

  async getBackupMetrics(): Promise<{
    total_recovery_points: number;
    total_file_backups: number;
    oldest_backup: string | null;
    newest_backup: string | null;
    storage_size_estimate: number;
  }> {
    const [recoveryPoints, fileBackups] = await Promise.all([
      supabase.from('recovery_points').select('id, created_at').order('created_at', { ascending: true }),
      supabase.from('storage_file_backups').select('id, file_size, backed_up_at').order('backed_up_at', { ascending: true })
    ]);

    const totalSize = fileBackups.data?.reduce((sum, backup) => sum + (backup.file_size || 0), 0) || 0;

    return {
      total_recovery_points: recoveryPoints.data?.length || 0,
      total_file_backups: fileBackups.data?.length || 0,
      oldest_backup: recoveryPoints.data?.[0]?.created_at || null,
      newest_backup: recoveryPoints.data?.[recoveryPoints.data.length - 1]?.created_at || null,
      storage_size_estimate: totalSize
    };
  }
}

export const monitoringService = new MonitoringService();
