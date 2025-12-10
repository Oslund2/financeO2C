import { Camera, Upload, Wand2, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import type { Database } from '../lib/database.types';

type StoryboardShot = Database['public']['Tables']['storyboard_shots']['Row'];

interface ShotStatusBadgeProps {
  shot: StoryboardShot;
  size?: 'sm' | 'md' | 'lg';
}

export function ShotStatusBadge({ shot, size = 'md' }: ShotStatusBadgeProps) {
  const hasImage = !!shot.image_url;
  const isGenerating = shot.generation_status === 'generating';
  const isFailed = shot.generation_status === 'failed';
  const source = (shot.generation_metadata as any)?.source;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  if (isGenerating) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} bg-blue-100 text-blue-700 rounded-full font-medium`}>
        <Loader className={`${iconSizes[size]} animate-spin`} />
        Generating
      </span>
    );
  }

  if (isFailed) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} bg-red-100 text-red-700 rounded-full font-medium`}>
        <AlertCircle className={iconSizes[size]} />
        Failed
      </span>
    );
  }

  if (hasImage) {
    if (source === 'manual_upload' || source === 'bulk_upload') {
      return (
        <span className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} bg-green-100 text-green-700 rounded-full font-medium`}>
          <Upload className={iconSizes[size]} />
          Uploaded
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} bg-purple-100 text-purple-700 rounded-full font-medium`}>
        <Wand2 className={iconSizes[size]} />
        AI Generated
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} bg-gray-100 text-gray-600 rounded-full font-medium`}>
      <Camera className={iconSizes[size]} />
      Empty
    </span>
  );
}

export function getCompletionPercentage(shots: StoryboardShot[]): number {
  if (shots.length === 0) return 0;
  const completed = shots.filter(s => s.image_url).length;
  return Math.round((completed / shots.length) * 100);
}

export function getCompletionStats(shots: StoryboardShot[]) {
  const total = shots.length;
  const withImages = shots.filter(s => s.image_url).length;
  const generating = shots.filter(s => s.generation_status === 'generating').length;
  const failed = shots.filter(s => s.generation_status === 'failed').length;
  const empty = total - withImages - generating;

  const uploaded = shots.filter(s => {
    const source = (s.generation_metadata as any)?.source;
    return s.image_url && (source === 'manual_upload' || source === 'bulk_upload');
  }).length;

  const aiGenerated = shots.filter(s => {
    const source = (s.generation_metadata as any)?.source;
    return s.image_url && source !== 'manual_upload' && source !== 'bulk_upload';
  }).length;

  return {
    total,
    withImages,
    empty,
    generating,
    failed,
    uploaded,
    aiGenerated,
    percentage: getCompletionPercentage(shots)
  };
}
