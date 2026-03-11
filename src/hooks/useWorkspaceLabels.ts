import { useWorkspaceCapabilities } from './useWorkspaceCapabilities';

export interface WorkspaceLabels {
  // Series-level
  series: string;
  seriesPlural: string;
  newSeries: string;
  // Episode-level
  episode: string;
  episodePlural: string;
  newEpisode: string;
  // Season/Flight
  season: string;
  // Script
  script: string;
  scriptPlural: string;
  // Production
  production: string;
  // Economics
  economics: string;
}

const EPISODIC_LABELS: WorkspaceLabels = {
  series: 'Series',
  seriesPlural: 'Series',
  newSeries: 'New Series',
  episode: 'Episode',
  episodePlural: 'Episodes',
  newEpisode: 'New Episode',
  season: 'Season',
  script: 'Script',
  scriptPlural: 'Scripts',
  production: 'Production',
  economics: 'Production Economics',
};

const COMMERCIAL_LABELS: WorkspaceLabels = {
  series: 'Campaign',
  seriesPlural: 'Campaigns',
  newSeries: 'New Campaign',
  episode: 'Spot',
  episodePlural: 'Spots',
  newEpisode: 'New Spot',
  season: 'Flight',
  script: 'Concept Script',
  scriptPlural: 'Concept Scripts',
  production: 'Production',
  economics: 'Project Economics',
};

export function useWorkspaceLabels(): WorkspaceLabels {
  const { isCommercial } = useWorkspaceCapabilities();
  return isCommercial ? COMMERCIAL_LABELS : EPISODIC_LABELS;
}
