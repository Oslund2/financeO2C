import { useState, useEffect } from 'react';
import { Plus, TrendingUp, Clock, CheckCircle, AlertCircle, Award, Globe, Sparkles, DollarSign, Languages, Tv, X, FileText, Film, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Logo } from './Logo';

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

type FullscreenCard = 'main' | 'production' | 'monetization' | 'global' | null;

export function Dashboard({ seriesId, onNavigate }: DashboardProps) {
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
  const [loading, setLoading] = useState(true);
  const [fullscreenCard, setFullscreenCard] = useState<FullscreenCard>(null);

  useEffect(() => {
    loadDashboardData();
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
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
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
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center gap-6">
          <Logo size="large" />
          <div>
            <h1 className="text-4xl font-bold text-scripps-navy mb-2">Spelling Bee Animation Studio</h1>
            <p className="text-lg text-gray-600">AI-Powered Animation Production</p>
          </div>
        </div>

        <div
          className="mb-8 bg-gradient-to-br from-scripps-navy via-scripps-blue to-scripps-light-blue rounded-2xl shadow-2xl overflow-hidden border border-scripps-blue cursor-pointer hover:shadow-3xl transition-all"
          onClick={() => setFullscreenCard('main')}
        >
          <div className="p-8 md:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Award className="w-8 h-8 text-scripps-yellow" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Leveraging Iconic IP for Global Entertainment</h2>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 border border-white/20">
              <p className="text-lg text-white/95 leading-relaxed mb-4">
                Leveraging the iconic <span className="font-semibold text-scripps-yellow">Scripps National Spelling Bee</span> brand, this animated series transforms historic winning words into hilarious, educational adventures.
              </p>
              <p className="text-base text-white/90 leading-relaxed mb-4">
                This groundbreaking format blends new fictional characters with real-life Bee champions (secured via perpetual NIL) to expand our IP universe. Each 22-minute episode is thematically anchored by a specific winning word and designed for global scale across Scripps linear assets and streaming platforms.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenCard('production');
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-scripps-yellow/20 rounded-lg flex items-center justify-center">
                    <Tv className="w-6 h-6 text-scripps-yellow" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Production Format</h3>
                </div>
                <div className="space-y-3 text-white/90">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-scripps-yellow mt-0.5 flex-shrink-0" />
                    <p className="text-sm leading-relaxed">
                      <span className="font-semibold">22-minute runtime</span> with optimized break structure
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-scripps-yellow mt-0.5 flex-shrink-0" />
                    <p className="text-sm leading-relaxed">
                      3 internal 2-minute breaks plus 1 end 2-minute break
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-scripps-yellow mt-0.5 flex-shrink-0" />
                    <p className="text-sm leading-relaxed">
                      Thematically anchored by historic Spelling Bee winning words
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenCard('monetization');
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-scripps-yellow/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-scripps-yellow" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Dynamic Monetization</h3>
                </div>
                <div className="space-y-3 text-white/90">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-5 h-5 text-scripps-yellow mt-0.5 flex-shrink-0" />
                    <p className="text-sm leading-relaxed">
                      <span className="font-semibold">AI-driven product placement</span> technology
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-5 h-5 text-scripps-yellow mt-0.5 flex-shrink-0" />
                    <p className="text-sm leading-relaxed">
                      Swappable sponsors per market or airing
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-5 h-5 text-scripps-yellow mt-0.5 flex-shrink-0" />
                    <p className="text-sm leading-relaxed">
                      Interchangeable branding opportunities for maximum revenue
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenCard('global');
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-scripps-yellow/20 rounded-lg flex items-center justify-center">
                    <Globe className="w-6 h-6 text-scripps-yellow" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Global Scale</h3>
                </div>
                <div className="space-y-3 text-white/90">
                  <div className="flex items-start gap-2">
                    <Languages className="w-5 h-5 text-scripps-yellow mt-0.5 flex-shrink-0" />
                    <p className="text-sm leading-relaxed">
                      <span className="font-semibold">Automated localization</span> for all languages
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Languages className="w-5 h-5 text-scripps-yellow mt-0.5 flex-shrink-0" />
                    <p className="text-sm leading-relaxed">
                      Distribution across Scripps linear and streaming platforms
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Languages className="w-5 h-5 text-scripps-yellow mt-0.5 flex-shrink-0" />
                    <p className="text-sm leading-relaxed">
                      Built for worldwide accessibility and cultural adaptation
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card) => (
            <button
              key={card.label}
              onClick={card.onClick}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 text-left group border border-gray-200 hover:border-scripps-light-blue"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center text-2xl shadow-md`}>
                  {card.icon}
                </div>
                <TrendingUp className="w-5 h-5 text-gray-400 group-hover:text-scripps-blue transition-colors" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{card.value}</div>
              <div className="text-sm font-medium text-gray-600">{card.label}</div>
            </button>
          ))}
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl shadow-md p-6 border-2 border-blue-200 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-scripps-blue rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Production Pipeline</h2>
                <p className="text-sm text-gray-600">Script-to-Episode workflow overview</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onNavigate('scripts')}
                className="text-sm font-medium text-scripps-blue hover:text-scripps-navy transition-colors"
              >
                View Scripts
              </button>
              <span className="text-gray-400">|</span>
              <button
                onClick={() => onNavigate('episodes')}
                className="text-sm font-medium text-scripps-blue hover:text-scripps-navy transition-colors"
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
                  <div
                    key={episode.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200"
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
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{episode.progress_percentage}%</div>
                      <div className="w-24 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-scripps-blue to-scripps-light-blue rounded-full transition-all"
                          style={{ width: `${episode.progress_percentage}%` }}
                        />
                      </div>
                    </div>
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
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Scripps Spelling Bee Series</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Create engaging claymation episodes featuring spelling bee adventures. Use AI to generate scripts, characters, and animations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {fullscreenCard && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200"
          onClick={() => setFullscreenCard(null)}
        >
          <button
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
                  <h2 className="text-5xl font-bold text-white">Leveraging Iconic IP for Global Entertainment</h2>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                    <p className="text-2xl text-white/95 leading-relaxed mb-6">
                      Leveraging the iconic <span className="font-semibold text-scripps-yellow">Scripps National Spelling Bee</span> brand, this animated series transforms historic winning words into hilarious, educational adventures.
                    </p>
                    <p className="text-xl text-white/90 leading-relaxed">
                      This groundbreaking format blends new fictional characters with real-life Bee champions (secured via perpetual NIL) to expand our IP universe. Each 22-minute episode is thematically anchored by a specific winning word and designed for global scale across Scripps linear assets and streaming platforms.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {fullscreenCard === 'production' && (
              <div className="bg-gradient-to-br from-scripps-navy via-scripps-blue to-scripps-light-blue rounded-3xl shadow-2xl p-12 border border-scripps-blue">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-20 h-20 bg-scripps-yellow/20 rounded-2xl flex items-center justify-center">
                    <Tv className="w-12 h-12 text-scripps-yellow" />
                  </div>
                  <h2 className="text-5xl font-bold text-white">Production Format</h2>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                    <div className="flex items-start gap-4 mb-6">
                      <CheckCircle className="w-8 h-8 text-scripps-yellow mt-1 flex-shrink-0" />
                      <p className="text-2xl text-white/90 leading-relaxed">
                        <span className="font-semibold">22-minute runtime</span> with optimized break structure
                      </p>
                    </div>
                    <div className="flex items-start gap-4 mb-6">
                      <CheckCircle className="w-8 h-8 text-scripps-yellow mt-1 flex-shrink-0" />
                      <p className="text-2xl text-white/90 leading-relaxed">
                        3 internal 2-minute breaks plus 1 end 2-minute break
                      </p>
                    </div>
                    <div className="flex items-start gap-4">
                      <CheckCircle className="w-8 h-8 text-scripps-yellow mt-1 flex-shrink-0" />
                      <p className="text-2xl text-white/90 leading-relaxed">
                        Thematically anchored by historic Spelling Bee winning words
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {fullscreenCard === 'monetization' && (
              <div className="bg-gradient-to-br from-scripps-navy via-scripps-blue to-scripps-light-blue rounded-3xl shadow-2xl p-12 border border-scripps-blue">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-20 h-20 bg-scripps-yellow/20 rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-12 h-12 text-scripps-yellow" />
                  </div>
                  <h2 className="text-5xl font-bold text-white">Dynamic Monetization</h2>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                    <div className="flex items-start gap-4 mb-6">
                      <Sparkles className="w-8 h-8 text-scripps-yellow mt-1 flex-shrink-0" />
                      <p className="text-2xl text-white/90 leading-relaxed">
                        <span className="font-semibold">AI-driven product placement</span> technology
                      </p>
                    </div>
                    <div className="flex items-start gap-4 mb-6">
                      <Sparkles className="w-8 h-8 text-scripps-yellow mt-1 flex-shrink-0" />
                      <p className="text-2xl text-white/90 leading-relaxed">
                        Swappable sponsors per market or airing
                      </p>
                    </div>
                    <div className="flex items-start gap-4">
                      <Sparkles className="w-8 h-8 text-scripps-yellow mt-1 flex-shrink-0" />
                      <p className="text-2xl text-white/90 leading-relaxed">
                        Interchangeable branding opportunities for maximum revenue
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {fullscreenCard === 'global' && (
              <div className="bg-gradient-to-br from-scripps-navy via-scripps-blue to-scripps-light-blue rounded-3xl shadow-2xl p-12 border border-scripps-blue">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-20 h-20 bg-scripps-yellow/20 rounded-2xl flex items-center justify-center">
                    <Globe className="w-12 h-12 text-scripps-yellow" />
                  </div>
                  <h2 className="text-5xl font-bold text-white">Global Scale</h2>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                    <div className="flex items-start gap-4 mb-6">
                      <Languages className="w-8 h-8 text-scripps-yellow mt-1 flex-shrink-0" />
                      <p className="text-2xl text-white/90 leading-relaxed">
                        <span className="font-semibold">Automated localization</span> for all languages
                      </p>
                    </div>
                    <div className="flex items-start gap-4 mb-6">
                      <Languages className="w-8 h-8 text-scripps-yellow mt-1 flex-shrink-0" />
                      <p className="text-2xl text-white/90 leading-relaxed">
                        Distribution across Scripps linear and streaming platforms
                      </p>
                    </div>
                    <div className="flex items-start gap-4">
                      <Languages className="w-8 h-8 text-scripps-yellow mt-1 flex-shrink-0" />
                      <p className="text-2xl text-white/90 leading-relaxed">
                        Built for worldwide accessibility and cultural adaptation
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
