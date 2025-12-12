import { supabase } from '../lib/supabase';

export interface ProgressMilestone {
  name: string;
  category: 'pre_production' | 'production' | 'post_production';
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'skipped';
  progress: number;
  weight: number;
  current_count: number;
  total_count: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface EpisodeProgressBreakdown {
  total_progress: number;
  pre_production_progress: number;
  production_progress: number;
  post_production_progress: number;
  milestones: ProgressMilestone[];
}

export interface CategoryProgress {
  category: string;
  displayName: string;
  progress: number;
  weight: number;
  milestones: ProgressMilestone[];
}

export interface WorkflowMilestone {
  name: string;
  status: 'not_started' | 'in_progress' | 'completed';
  count: number;
  total: number | null;
  navigation_target: string;
  completed_at: string | null;
  action_label: string;
  icon: string;
  description: string;
}

export interface WorkflowProgress {
  milestones: WorkflowMilestone[];
  overall_progress: number;
  completed_count: number;
  total_count: number;
  episode_id: string;
  episode_title: string;
  next_step?: WorkflowMilestone | null;
}

export class EpisodeProgressService {
  static async getProgressBreakdown(episodeId: string): Promise<EpisodeProgressBreakdown | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_episode_progress_breakdown', { p_episode_id: episodeId });

      if (error) throw error;
      if (!data) return null;

      return {
        total_progress: data.total_progress || 0,
        pre_production_progress: data.pre_production_progress || 0,
        production_progress: data.production_progress || 0,
        post_production_progress: data.post_production_progress || 0,
        milestones: data.milestones || [],
      };
    } catch (error) {
      console.error('Error fetching episode progress breakdown:', error);
      return null;
    }
  }

  static async calculateEpisodeProgress(episodeId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('calculate_episode_progress', { p_episode_id: episodeId });

      if (error) throw error;

      return data && data.length > 0 ? data[0].total_progress : 0;
    } catch (error) {
      console.error('Error calculating episode progress:', error);
      return 0;
    }
  }

  static async updateEpisodeProgress(episodeId: string): Promise<boolean> {
    try {
      const progress = await this.calculateEpisodeProgress(episodeId);

      const { error } = await supabase
        .from('episodes')
        .update({ progress_percentage: Math.round(progress) })
        .eq('id', episodeId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating episode progress:', error);
      return false;
    }
  }

  static async recalculateAllProgress(seriesId?: string): Promise<{ success: number; failed: number }> {
    try {
      let query = supabase.from('episodes').select('id');

      if (seriesId) {
        query = query.eq('series_id', seriesId);
      }

      const { data: episodes, error } = await query;

      if (error) throw error;
      if (!episodes) return { success: 0, failed: 0 };

      let success = 0;
      let failed = 0;

      for (const episode of episodes) {
        try {
          await this.calculateEpisodeProgress(episode.id);
          success++;
        } catch (err) {
          console.error(`Failed to recalculate progress for episode ${episode.id}:`, err);
          failed++;
        }
      }

      return { success, failed };
    } catch (error) {
      console.error('Error recalculating all episode progress:', error);
      return { success: 0, failed: 0 };
    }
  }

  static getCategoryProgress(breakdown: EpisodeProgressBreakdown): CategoryProgress[] {
    const categories: { [key: string]: { name: string; weight: number } } = {
      pre_production: { name: 'Pre-Production', weight: 25 },
      production: { name: 'Production', weight: 50 },
      post_production: { name: 'Post-Production', weight: 25 },
    };

    return Object.entries(categories).map(([key, { name, weight }]) => {
      const categoryMilestones = breakdown.milestones.filter(m => m.category === key);
      const progressKey = `${key}_progress` as keyof EpisodeProgressBreakdown;
      const progress = breakdown[progressKey] as number;

      return {
        category: key,
        displayName: name,
        progress: progress || 0,
        weight,
        milestones: categoryMilestones,
      };
    });
  }

  static getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'blocked':
        return 'text-red-600 bg-red-100';
      case 'skipped':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-400 bg-gray-50';
    }
  }

  static getStatusIcon(status: string): string {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in_progress':
        return '◐';
      case 'blocked':
        return '!';
      case 'skipped':
        return '–';
      default:
        return '○';
    }
  }

  static getCategoryColor(category: string): string {
    switch (category) {
      case 'pre_production':
        return 'from-blue-500 to-blue-600';
      case 'production':
        return 'from-purple-500 to-purple-600';
      case 'post_production':
        return 'from-green-500 to-green-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  }

  static formatMilestoneDescription(milestone: ProgressMilestone): string {
    if (milestone.total_count > 0) {
      return `${milestone.current_count} of ${milestone.total_count}`;
    }
    return '';
  }

  static async initializeEpisodeProgress(episodeId: string, organizationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .rpc('initialize_episode_progress_milestones', {
          p_episode_id: episodeId,
          p_organization_id: organizationId,
        });

      if (error) throw error;

      await this.calculateEpisodeProgress(episodeId);

      return true;
    } catch (error) {
      console.error('Error initializing episode progress:', error);
      return false;
    }
  }

  static getProgressColor(progress: number): string {
    if (progress === 0) return 'bg-gray-200';
    if (progress < 25) return 'bg-red-500';
    if (progress < 50) return 'bg-orange-500';
    if (progress < 75) return 'bg-yellow-500';
    if (progress < 100) return 'bg-blue-500';
    return 'bg-green-500';
  }

  static async getWorkflowProgress(episodeId: string): Promise<WorkflowProgress | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_episode_workflow_milestones', { p_episode_id: episodeId });

      if (error) throw error;
      if (!data) return null;

      const result = data as WorkflowProgress;

      const nextStep = result.milestones.find(m => m.status !== 'completed') || null;

      return {
        ...result,
        next_step: nextStep
      };
    } catch (error) {
      console.error('Error fetching workflow progress:', error);
      return null;
    }
  }

  static getNextStepRecommendation(workflow: WorkflowProgress): string {
    if (!workflow.next_step) {
      return 'All workflow steps completed!';
    }

    const step = workflow.next_step;
    const recommendations: { [key: string]: string } = {
      'Characters': 'Add characters to your series to use in episodes',
      'Script': 'Link a script to this episode to begin production',
      'Storyboard': 'Generate a storyboard from your script',
      'Shot List': 'Create a detailed shot list for production',
      'Prompts': 'Generate AI prompts for your shots',
      'Rendering': 'Start rendering shots with AI video generation',
      'Lip Sync': 'Synchronize dialogue with character animations',
      'Final Video': 'Export the final video for delivery'
    };

    return recommendations[step.name] || `Complete ${step.name} to continue`;
  }
}
