import { useState, useEffect, useCallback } from 'react';
import { Plus, TrendingUp, Clock, CheckCircle, AlertCircle, Award, Globe, Sparkles, DollarSign, Languages, Tv, X, FileText, Film, ArrowRight, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SystemHealthWidget } from './SystemHealthWidget';
import { CastFilmStrip } from './CastFilmStrip';
import { DashboardIPSectionEditor } from './DashboardIPSectionEditor';
import { EpisodeProgressBreakdown } from './EpisodeProgressBreakdown';
import { VideoTrailerShowcase } from './VideoTrailerShowcase';
import { VideoSelectorModal } from './VideoSelectorModal';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';

interface DashboardProps {
  seriesId: string | null;
  onNavigate: (view: string) => void;
}

interface Stats {
  charactersCount: number;
  scriptsCount: number;
  episodesCount: number;
  assetsCount: number;
}

interface PipelineStats {
  draftScripts: number;
  approvedScripts: number;
  episodesInProduction: number;
  completedEpisodes: number;
}

interface CardItem {
  icon: string;
  text: string;
}

interface Card {
  title: string;
  icon: string;
  items: CardItem[];
}

interface IPSectionData {
  section_title: string;
  section_description_1: string;
  section_description_2: string;
  card_1: Card;
  card_2: Card;
  card_3: Card;
}

type FullscreenCard = 'main' | 'production' | 'monetization' | 'global' | null;

const DEFAULT_IP_SECTION: IPSectionData = {
  section_title: 'Leveraging Iconic IP for Global Entertainment',
  section_description_1: 'Leveraging the iconic Scripps National Spelling Bee brand, this animated series transforms historic winning words into hilarious, educational adventures all steeped in pop culture and Zeitgeist. The Bee and its animated series creates virtuous year-round brand and marketing opportunities.',
  section_description_2: 'This groundbreaking format blends new fictional characters with real-life Bee champions (secured via perpetual NIL) to expand our IP universe. Each 22-minute episode is thematically anchored by a specific winning word and designed for global scale across Scripps linear assets and streaming platforms.',
  card_1: {
    title: 'Production Format',
    icon: 'Tv',
    items: [
      { icon: 'CheckCircle', text: '22-minute runtime with optimized break structure' },
      { icon: 'CheckCircle', text: '3 internal 2-minute breaks plus 1 end 2-minute break' },
      { icon: 'CheckCircle', text: 'Thematically anchored by historic Spelling Bee winning words' },
    ],
  },
  card_2: {
    title: 'Dynamic Monetization',
    icon: 'DollarSign',
    items: [
      { icon: 'Sparkles', text: 'AI-driven product placement technology' },
      { icon: 'Sparkles', text: 'Swappable sponsors per market or airing' },
      { icon: 'Sparkles', text: 'Interchangeable branding opportunities for maximum revenue' },
    ],
  },
  card_3: {
    title: 'Global Scale',
    icon: 'Globe',
    items: [
      { icon: 'Languages', text: 'Automated localization for all languages' },
      { icon: 'Languages', text: 'Distribution across Scripps linear and streaming platforms' },
      { icon: 'Languages', text: 'Built for worldwide accessibility and cultural adaptation' },
    ],
  },
};

export function Dashboard({ seriesId, onNavigate }: DashboardProps) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  const [stats, setStats] = useState<Stats>({
    charactersCount: 0,
    scriptsCount: 0,
    episodesCount: 0,
    assetsCount: 0,
  });
  const [pipelineStats, setPipelineStats] = useState<PipelineStats>({
    draftScripts: 0,
    approvedScripts: 0,
    episodesInProduction: 0,
    completedEpisodes: 0,
  });
  const [recentEpisodes, setRecentEpisodes] = useState<any[]>([]);
  const [recentScripts, setRecentScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullscreenCard, setFullscreenCard] = useState<FullscreenCard>(null);
  const [ipSectionCollapsed, setIpSectionCollapsed] = useState(true);
  const [ipSectionData, setIpSectionData] = useState<IPSectionData>(DEFAULT_IP_SECTION);
  const [ipSectionSource, setIpSectionSource] = useState<'series' | 'organization' | 'default'>('default');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorInitialTab, setEditorInitialTab] = useState<'main' | 'card1' | 'card2' | 'card3'>('main');
  const [seriesName, setSeriesName] = useState<string>('');
  const [expandedEpisodeId, setExpandedEpisodeId] = useState<string | null>(null);
  const [showVideoSelector, setShowVideoSelector] = useState(false);
  const [trailerRefreshKey, setTrailerRefreshKey] = useState(0);
  const [currentTrailerId, setCurrentTrailerId] = useState<string | null>(null);
  const [trailerSectionCollapsed, setTrailerSectionCollapsed] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadIPSectionData();
    loadSeriesName();
    loadCurrentTrailerId();
  }, [seriesId, currentOrganization]);

  const loadCurrentTrailerId = async () => {
    if (!seriesId) {
      setCurrentTrailerId(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('series')
        .select('featured_trailer_id')
        .eq('id', seriesId)
        .maybeSingle();
      if (error) throw error;
      setCurrentTrailerId(data?.featured_trailer_id || null);
    } catch (error) {
      console.error('Error loading current trailer ID:', error);
    }
  };

  const handleTrailerSaved = useCallback(() => {
    setTrailerRefreshKey(prev => prev + 1);
    loadCurrentTrailerId();
  }, [seriesId]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenCard) {
        setFullscreenCard(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [fullscreenCard]);

  const loadDashboardData = async () => {
    try {
      let charactersQuery = supabase.from('characters').select('id', { count: 'exact', head: true });
      let scriptsQuery = supabase.from('scripts').select('id', { count: 'exact', head: true });
      let episodesQuery = supabase.from('episodes').select('id', { count: 'exact', head: true });
      let assetsQuery = supabase.from('assets').select('id', { count: 'exact', head: true });
      let recentEpisodesQuery = supabase
        .from('episodes')
        .select('id, title, status, progress_percentage, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      let recentScriptsQuery = supabase
        .from('scripts')
        .select('id, title, status, ai_generated, created_at, theme')
        .order('created_at', { ascending: false })
        .limit(5);

      let draftScriptsQuery = supabase.from('scripts').select('id', { count: 'exact', head: true }).eq('status', 'draft');
      let approvedScriptsQuery = supabase.from('scripts').select('id', { count: 'exact', head: true }).eq('status', 'approved');
      let inProductionQuery = supabase.from('episodes').select('id', { count: 'exact', head: true }).neq('status', 'completed');
      let completedEpisodesQuery = supabase.from('episodes').select('id', { count: 'exact', head: true }).eq('status', 'completed');

      if (seriesId) {
        charactersQuery = charactersQuery.eq('series_id', seriesId);
        scriptsQuery = scriptsQuery.eq('series_id', seriesId);
        episodesQuery = episodesQuery.eq('series_id', seriesId);
        assetsQuery = assetsQuery.eq('series_id', seriesId);
        recentEpisodesQuery = recentEpisodesQuery.eq('series_id', seriesId);
        recentScriptsQuery = recentScriptsQuery.eq('series_id', seriesId);
        draftScriptsQuery = draftScriptsQuery.eq('series_id', seriesId);
        approvedScriptsQuery = approvedScriptsQuery.eq('series_id', seriesId);
        inProductionQuery = inProductionQuery.eq('series_id', seriesId);
        completedEpisodesQuery = completedEpisodesQuery.eq('series_id', seriesId);
      }

      const [
        charactersRes,
        scriptsRes,
        episodesRes,
        assetsRes,
        recentEpisodesRes,
        recentScriptsRes,
        draftScriptsRes,
        approvedScriptsRes,
        inProductionRes,
        completedEpisodesRes,
      ] = await Promise.all([
        charactersQuery,
        scriptsQuery,
        episodesQuery,
        assetsQuery,
        recentEpisodesQuery,
        recentScriptsQuery,
        draftScriptsQuery,
        approvedScriptsQuery,
        inProductionQuery,
        completedEpisodesQuery,
      ]);

      setStats({
        charactersCount: charactersRes.count || 0,
        scriptsCount: scriptsRes.count || 0,
        episodesCount: episodesRes.count || 0,
        assetsCount: assetsRes.count || 0,
      });

      setPipelineStats({
        draftScripts: draftScriptsRes.count || 0,
        approvedScripts: approvedScriptsRes.count || 0,
        episodesInProduction: inProductionRes.count || 0,
        completedEpisodes: completedEpisodesRes.count || 0,
      });

      setRecentEpisodes(recentEpisodesRes.data || []);
      setRecentScripts(recentScriptsRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadIPSectionData = async () => {
    if (!currentOrganization) {
      setIpSectionData(DEFAULT_IP_SECTION);
      setIpSectionSource('default');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_dashboard_ip_section', {
        org_uuid: currentOrganization.id,
        series_uuid: seriesId,
      });

      if (error) throw error;

      if (data) {
        setIpSectionData(data);
        setIpSectionSource(data.source);
      } else {
        setIpSectionData(DEFAULT_IP_SECTION);
        setIpSectionSource('default');
      }
    } catch (error) {
      console.error('Error loading IP section data:', error);
      setIpSectionData(DEFAULT_IP_SECTION);
      setIpSectionSource('default');
    }
  };

  const loadSeriesName = async () => {
    if (!seriesId) {
      setSeriesName('');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('series')
        .select('name')
        .eq('id', seriesId)
        .single();

      if (error) throw error;
      setSeriesName(data?.name || '');
    } catch (error) {
      console.error('Error loading series name:', error);
      setSeriesName('');
    }
  };

  const handleSaveIPSection = async (data: IPSectionData, applyToAllSeries: boolean) => {
    if (!currentOrganization || !user) {
      throw new Error('Organization or user not found');
    }

    try {
      const targetSeriesId = applyToAllSeries ? null : seriesId;

      const sectionData = {
        section_title: data.section_title,
        section_description_1: data.section_description_1,
        section_description_2: data.section_description_2,
        card_1: {
          title: data.card_1.title,
          icon: data.card_1.icon,
          items: data.card_1.items,
        },
        card_2: {
          title: data.card_2.title,
          icon: data.card_2.icon,
          items: data.card_2.items,
        },
        card_3: {
          title: data.card_3.title,
          icon: data.card_3.icon,
          items: data.card_3.items,
        },
      };

      const { error } = await supabase.rpc('upsert_dashboard_ip_section', {
        org_uuid: currentOrganization.id,
        series_uuid: targetSeriesId,
        section_data: sectionData,
        user_uuid: user.id,
      });

      if (error) throw error;

      await loadIPSectionData();
    } catch (error) {
      console.error('Error saving IP section:', error);
      throw error;
    }
  };

  const statCards = [
    {
      label: 'Characters',
      value: stats.charactersCount,
      icon: '🎭',
      color: 'from-scripps-blue to-scripps-light-blue',
      onClick: () => onNavigate('characters'),
    },
    {
      label: 'Scripts',
      value: stats.scriptsCount,
      icon: '📝',
      color: 'from-scripps-navy to-scripps-blue',
      onClick: () => onNavigate('scripts'),
    },
    {
      label: 'Episodes',
      value: stats.episodesCount,
      icon: '🎬',
      color: 'from-scripps-light-blue to-blue-400',
      onClick: () => onNavigate('episodes'),
    },
    {
      label: 'Assets',
      value: stats.assetsCount,
      icon: '🎨',
      color: 'from-scripps-yellow to-yellow-400',
      onClick: () => onNavigate('assets'),
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'planning':
      case 'script':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <TrendingUp className="w-5 h-5 text-amber-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'planning':
      case 'script':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'CheckCircle':
        return CheckCircle;
      case 'Sparkles':
        return Sparkles;
      case 'Languages':
        return Languages;
      case 'Tv':
        return Tv;
      case 'DollarSign':
        return DollarSign;
      case 'Globe':
        return Globe;
      default:
        return CheckCircle;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-scripps-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-scripps-navy mb-1 sm:mb-2">Scripps AI Studio</h1>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600">AI-Powered Storytelling Assistant</p>
        </div>

        <CastFilmStrip seriesId={seriesId} onNavigate={onNavigate} seriesName={seriesName} />

        {seriesId && (
          <VideoTrailerShowcase
            key={trailerRefreshKey}
            seriesId={seriesId}
            onNavigate={onNavigate}
            onOpenSelector={() => setShowVideoSelector(true)}
            isCollapsed={trailerSectionCollapsed}
            onToggleCollapse={() => setTrailerSectionCollapsed(!trailerSectionCollapsed)}
          />
        )}

        <div className="mb-6 sm:mb-8 bg-gradient-to-br from-scripps-navy via-scripps-blue to-scripps-light-blue rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border border-scripps-blue transition-all">
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 flex-1">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <Award className="w-6 h-6 sm:w-8 sm:h-8 text-scripps-yellow" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{ipSectionData.section_title}</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!ipSectionCollapsed && (
                  <button
                    onClick={() => {
                      setEditorInitialTab('main');
                      setIsEditorOpen(true);
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Edit section"
                  >
                    <Edit2 className="w-5 h-5 text-white" />
                  </button>
                )}
                <button
                  onClick={() => setIpSectionCollapsed(!ipSectionCollapsed)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label={ipSectionCollapsed ? "Expand section" : "Collapse section"}
                >
                  {ipSectionCollapsed ? (
                    <ChevronDown className="w-6 h-6 text-white" />
                  ) : (
                    <ChevronUp className="w-6 h-6 text-white" />
                  )}
                </button>
              </div>
            </div>

            {!ipSectionCollapsed && (
              <>
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-white/20">
                  <p className="text-sm sm:text-base lg:text-lg text-white/95 leading-relaxed mb-3 sm:mb-4">
                    {ipSectionData.section_description_1}
                  </p>
                  <p className="text-xs sm:text-sm lg:text-base text-white/90 leading-relaxed">
                    {ipSectionData.section_description_2}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {[ipSectionData.card_1, ipSectionData.card_2, ipSectionData.card_3].map((card, cardIndex) => {
                    const CardIcon = getIconComponent(card.icon);
                    return (
                      <div
                        key={cardIndex}
                        className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/20 hover:bg-white/15 transition-all cursor-pointer active:bg-white/20 relative group"
                        onClick={(e) => {
                          e.stopPropagation();
                          const cardNames = ['production', 'monetization', 'global'] as const;
                          setFullscreenCard(cardNames[cardIndex]);
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const tabNames = ['card1', 'card2', 'card3'] as const;
                            setEditorInitialTab(tabNames[cardIndex]);
                            setIsEditorOpen(true);
                          }}
                          className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-10"
                          aria-label={`Edit ${card.title}`}
                        >
                          <Edit2 className="w-4 h-4 text-white" />
                        </button>
                        <div className="flex items-center gap-3 mb-3 sm:mb-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-scripps-yellow/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <CardIcon className="w-5 h-5 sm:w-6 sm:h-6 text-scripps-yellow" />
                          </div>
                          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white">{card.title}</h3>
                        </div>
                        <div className="space-y-3 text-white/90">
                          {card.items.map((item, itemIndex) => {
                            const ItemIcon = getIconComponent(item.icon);
                            return (
                              <div key={itemIndex} className="flex items-start gap-2">
                                <ItemIcon className="w-5 h-5 text-scripps-yellow mt-0.5 flex-shrink-0" />
                                <p className="text-sm leading-relaxed">{item.text}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          {statCards.map((card) => (
            <button
              key={card.label}
              onClick={card.onClick}
              className="bg-white rounded-xl shadow-md hover:shadow-xl active:shadow-lg transition-all p-4 sm:p-6 text-left group border border-gray-200 hover:border-scripps-light-blue min-h-[120px] sm:min-h-0"
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center text-xl sm:text-2xl shadow-md flex-shrink-0`}>
                  {card.icon}
                </div>
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-scripps-blue transition-colors flex-shrink-0" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{card.value}</div>
              <div className="text-xs sm:text-sm font-medium text-gray-600">{card.label}</div>
            </button>
          ))}
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl shadow-md p-4 sm:p-6 border-2 border-blue-200 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-scripps-blue rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Production Pipeline</h2>
                <p className="text-xs sm:text-sm text-gray-600">Script-to-Episode workflow</p>
              </div>
            </div>
            <div className="flex gap-2 text-sm">
              <button
                onClick={() => onNavigate('scripts')}
                className="font-medium text-scripps-blue hover:text-scripps-navy transition-colors min-h-[44px] px-3 flex items-center"
              >
                View Scripts
              </button>
              <span className="text-gray-400">|</span>
              <button
                onClick={() => onNavigate('episodes')}
                className="font-medium text-scripps-blue hover:text-scripps-navy transition-colors min-h-[44px] px-3 flex items-center"
              >
                View Episodes
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => onNavigate('scripts')}
              className="bg-white rounded-lg p-5 border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{pipelineStats.draftScripts}</div>
              </div>
              <div className="text-sm font-semibold text-gray-700 mb-1">Draft Scripts</div>
              <div className="text-xs text-gray-500">Needs approval</div>
            </button>

            <button
              onClick={() => onNavigate('scripts')}
              className="bg-white rounded-lg p-5 border-2 border-blue-200 hover:border-blue-300 hover:shadow-md transition-all text-left group relative"
            >
              <div className="absolute -left-3 top-1/2 -translate-y-1/2">
                <ArrowRight className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-blue-700">{pipelineStats.approvedScripts}</div>
              </div>
              <div className="text-sm font-semibold text-gray-700 mb-1">Approved Scripts</div>
              <div className="text-xs text-blue-600 font-medium">Ready to produce!</div>
            </button>

            <button
              onClick={() => onNavigate('episodes')}
              className="bg-white rounded-lg p-5 border-2 border-yellow-200 hover:border-yellow-300 hover:shadow-md transition-all text-left group relative"
            >
              <div className="absolute -left-3 top-1/2 -translate-y-1/2">
                <ArrowRight className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                  <Film className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="text-3xl font-bold text-yellow-700">{pipelineStats.episodesInProduction}</div>
              </div>
              <div className="text-sm font-semibold text-gray-700 mb-1">In Production</div>
              <div className="text-xs text-yellow-600 font-medium">Active episodes</div>
            </button>

            <button
              onClick={() => onNavigate('episodes')}
              className="bg-white rounded-lg p-5 border-2 border-green-200 hover:border-green-300 hover:shadow-md transition-all text-left group relative"
            >
              <div className="absolute -left-3 top-1/2 -translate-y-1/2">
                <ArrowRight className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-green-700">{pipelineStats.completedEpisodes}</div>
              </div>
              <div className="text-sm font-semibold text-gray-700 mb-1">Completed</div>
              <div className="text-xs text-green-600 font-medium">Ready to air!</div>
            </button>
          </div>

          {pipelineStats.approvedScripts > 0 && (
            <div className="mt-4 p-4 bg-blue-100 border border-blue-300 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-blue-700 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">{pipelineStats.approvedScripts} approved script{pipelineStats.approvedScripts !== 1 ? 's are' : ' is'}</span> ready to become episode{pipelineStats.approvedScripts !== 1 ? 's' : ''}!
                  <button
                    onClick={() => onNavigate('scripts')}
                    className="ml-2 underline hover:no-underline font-medium"
                  >
                    View Scripts
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Recent Episodes</h2>
              <button
                onClick={() => onNavigate('episodes')}
                className="text-sm font-medium text-scripps-blue hover:text-scripps-navy"
              >
                View all
              </button>
            </div>

            {recentEpisodes.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No episodes yet</p>
                <button
                  onClick={() => onNavigate('scripts')}
                  className="px-4 py-2 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium"
                >
                  Create Your First Script
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentEpisodes.map((episode) => (
                  <div key={episode.id} className="rounded-lg bg-gray-50 border border-gray-200 overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => setExpandedEpisodeId(expandedEpisodeId === episode.id ? null : episode.id)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {getStatusIcon(episode.status)}
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{episode.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(episode.status)}`}>
                              {episode.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(episode.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{episode.progress_percentage}%</div>
                          <div className="w-24 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-scripps-blue to-scripps-light-blue rounded-full transition-all"
                              style={{ width: `${episode.progress_percentage}%` }}
                            />
                          </div>
                        </div>
                        {expandedEpisodeId === episode.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                    {expandedEpisodeId === episode.id && (
                      <div className="border-t border-gray-200">
                        <EpisodeProgressBreakdown episodeId={episode.id} onNavigate={onNavigate} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => onNavigate('characters')}
                className="w-full flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white hover:shadow-lg transition-all text-left"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">New Character</span>
              </button>

              <button
                onClick={() => onNavigate('ai-studio')}
                className="w-full flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-scripps-navy to-scripps-blue text-white hover:shadow-lg transition-all text-left"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Generate Script</span>
              </button>

              <button
                onClick={() => onNavigate('assets')}
                className="w-full flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-scripps-yellow to-yellow-400 text-gray-900 hover:shadow-lg transition-all text-left"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Create Asset</span>
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">AI-Powered Content Creation</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Create engaging animated series with AI assistance. Generate scripts, develop characters, and produce high-quality animations efficiently.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 mt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-scripps-blue" />
              <h2 className="text-xl font-bold text-gray-900">Recent Scripts</h2>
            </div>
            <button
              onClick={() => onNavigate('scripts')}
              className="text-sm font-medium text-scripps-blue hover:text-scripps-navy flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {recentScripts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No scripts yet</p>
              <button
                onClick={() => onNavigate('ai-studio')}
                className="px-4 py-2 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium flex items-center gap-2 mx-auto"
              >
                <Sparkles className="w-4 h-4" />
                Generate Your First Script
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentScripts.map((script) => {
                const isNew = () => {
                  const created = new Date(script.created_at);
                  const now = new Date();
                  const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
                  return hoursDiff < 24;
                };

                return (
                  <div
                    key={script.id}
                    onClick={() => onNavigate('scripts')}
                    className="p-4 rounded-lg bg-gradient-to-br from-gray-50 to-blue-50 hover:from-blue-50 hover:to-blue-100 transition-all border border-gray-200 hover:border-blue-300 cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 group-hover:text-scripps-blue transition-colors">
                        {script.title}
                      </h3>
                      {isNew() && (
                        <div className="px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs rounded-full font-bold animate-pulse">
                          NEW
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      {script.ai_generated && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                          <Sparkles className="w-3 h-3" />
                          <span className="font-medium">AI</span>
                        </div>
                      )}
                      <div className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                        {script.status}
                      </div>
                    </div>

                    {script.theme && (
                      <p className="text-sm text-gray-600 line-clamp-2">{script.theme}</p>
                    )}

                    <div className="mt-3 text-xs text-gray-500">
                      {new Date(script.created_at).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 sm:mt-8">
          <SystemHealthWidget onNavigateToBackup={() => onNavigate('backup-recovery')} />
        </div>
      </div>

      {fullscreenCard && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200"
          onClick={() => setFullscreenCard(null)}
        >
          <button
            type="button"
            onClick={() => setFullscreenCard(null)}
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all border border-white/20 hover:scale-110"
            aria-label="Close fullscreen view"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="max-w-5xl w-full animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {fullscreenCard === 'main' && (
              <div className="bg-gradient-to-br from-scripps-navy via-scripps-blue to-scripps-light-blue rounded-3xl shadow-2xl p-12 border border-scripps-blue">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <Award className="w-12 h-12 text-scripps-yellow" />
                  </div>
                  <h2 className="text-5xl font-bold text-white">{ipSectionData.section_title}</h2>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                    <p className="text-2xl text-white/95 leading-relaxed mb-6">
                      {ipSectionData.section_description_1}
                    </p>
                    <p className="text-xl text-white/90 leading-relaxed">
                      {ipSectionData.section_description_2}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {fullscreenCard === 'production' && (() => {
              const CardIcon = getIconComponent(ipSectionData.card_1.icon);
              return (
              <div className="bg-gradient-to-br from-scripps-navy via-scripps-blue to-scripps-light-blue rounded-3xl shadow-2xl p-12 border border-scripps-blue">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-20 h-20 bg-scripps-yellow/20 rounded-2xl flex items-center justify-center">
                    <CardIcon className="w-12 h-12 text-scripps-yellow" />
                  </div>
                  <h2 className="text-5xl font-bold text-white">{ipSectionData.card_1.title}</h2>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                    {ipSectionData.card_1.items.map((item, index) => {
                      const ItemIcon = getIconComponent(item.icon);
                      return (
                        <div key={index} className={`flex items-start gap-4 ${index < ipSectionData.card_1.items.length - 1 ? 'mb-6' : ''}`}>
                          <ItemIcon className="w-8 h-8 text-scripps-yellow mt-1 flex-shrink-0" />
                          <p className="text-2xl text-white/90 leading-relaxed">{item.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
            })()}

            {fullscreenCard === 'monetization' && (() => {
              const CardIcon = getIconComponent(ipSectionData.card_2.icon);
              return (
              <div className="bg-gradient-to-br from-scripps-navy via-scripps-blue to-scripps-light-blue rounded-3xl shadow-2xl p-12 border border-scripps-blue">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-20 h-20 bg-scripps-yellow/20 rounded-2xl flex items-center justify-center">
                    <CardIcon className="w-12 h-12 text-scripps-yellow" />
                  </div>
                  <h2 className="text-5xl font-bold text-white">{ipSectionData.card_2.title}</h2>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                    {ipSectionData.card_2.items.map((item, index) => {
                      const ItemIcon = getIconComponent(item.icon);
                      return (
                        <div key={index} className={`flex items-start gap-4 ${index < ipSectionData.card_2.items.length - 1 ? 'mb-6' : ''}`}>
                          <ItemIcon className="w-8 h-8 text-scripps-yellow mt-1 flex-shrink-0" />
                          <p className="text-2xl text-white/90 leading-relaxed">{item.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
            })()}

            {fullscreenCard === 'global' && (() => {
              const CardIcon = getIconComponent(ipSectionData.card_3.icon);
              return (
              <div className="bg-gradient-to-br from-scripps-navy via-scripps-blue to-scripps-light-blue rounded-3xl shadow-2xl p-12 border border-scripps-blue">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-20 h-20 bg-scripps-yellow/20 rounded-2xl flex items-center justify-center">
                    <CardIcon className="w-12 h-12 text-scripps-yellow" />
                  </div>
                  <h2 className="text-5xl font-bold text-white">{ipSectionData.card_3.title}</h2>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                    {ipSectionData.card_3.items.map((item, index) => {
                      const ItemIcon = getIconComponent(item.icon);
                      return (
                        <div key={index} className={`flex items-start gap-4 ${index < ipSectionData.card_3.items.length - 1 ? 'mb-6' : ''}`}>
                          <ItemIcon className="w-8 h-8 text-scripps-yellow mt-1 flex-shrink-0" />
                          <p className="text-2xl text-white/90 leading-relaxed">{item.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
            })()}
          </div>
        </div>
      )}

      <DashboardIPSectionEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveIPSection}
        initialData={ipSectionData}
        currentSource={ipSectionSource}
        seriesId={seriesId}
        initialTab={editorInitialTab}
      />

      {seriesId && (
        <VideoSelectorModal
          seriesId={seriesId}
          isOpen={showVideoSelector}
          onClose={() => setShowVideoSelector(false)}
          onSave={handleTrailerSaved}
          currentTrailerId={currentTrailerId}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
