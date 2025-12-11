import { useState, useEffect } from 'react';
import { Film, Check, Plus, ChevronDown, Settings, Edit, Copy, Archive, ArchiveRestore, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import { SeriesManagementModal } from './SeriesManagementModal';
import { useAuth } from '../contexts/AuthContext';

interface Series {
  id: string;
  name: string;
  description: string | null;
  theme: string;
  style_guide: string;
  organization_id: string;
  archived?: boolean;
  archived_at?: string;
}

interface SeriesSwitcherProps {
  currentSeriesId: string | null;
  onSeriesChange: (seriesId: string) => void;
}

export function SeriesSwitcher({ currentSeriesId, onSeriesChange }: SeriesSwitcherProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [series, setSeries] = useState<Series[]>([]);
  const [archivedSeries, setArchivedSeries] = useState<Series[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newSeriesTheme, setNewSeriesTheme] = useState('');
  const [managingSeries, setManagingSeries] = useState<Series | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrganization) {
      fetchSeries();
      fetchArchivedSeries();
    }
  }, [currentOrganization]);

  const fetchSeries = async () => {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSeries(data || []);
    } catch (error) {
      console.error('Error fetching series:', error);
    }
  };

  const fetchArchivedSeries = async () => {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('archived', true)
        .order('archived_at', { ascending: false });

      if (error) throw error;
      setArchivedSeries(data || []);
    } catch (error) {
      console.error('Error fetching archived series:', error);
    }
  };

  const handleRestoreSeries = async (seriesId: string) => {
    if (!user) return;

    setRestoringId(seriesId);
    try {
      const { data, error } = await supabase.rpc('restore_series', {
        series_uuid: seriesId,
        user_uuid: user.id,
      });

      if (error) {
        console.error('Supabase error:', error);
        alert(`Failed to restore series: ${error.message}`);
        return;
      }

      if (data.success) {
        alert('Series restored successfully');
        fetchSeries();
        fetchArchivedSeries();
      } else {
        alert(`Failed to restore series: ${data.error}`);
      }
    } catch (error) {
      console.error('Error restoring series:', error);
      alert(`Failed to restore series: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRestoringId(null);
    }
  };

  const createSeries = async () => {
    if (!currentOrganization || !newSeriesName.trim()) return;

    setIsCreating(true);
    try {
      const { data: newSeries, error } = await supabase
        .from('series')
        .insert([
          {
            name: newSeriesName,
            theme: newSeriesTheme || 'General Animation',
            style_guide: 'Custom animation style',
            description: `A new animation series: ${newSeriesName}`,
            organization_id: currentOrganization.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setSeries([newSeries, ...series]);
      onSeriesChange(newSeries.id);
      setNewSeriesName('');
      setNewSeriesTheme('');
      setIsOpen(false);
    } catch (error) {
      console.error('Error creating series:', error);
      alert('Failed to create series. Check console for details.');
    } finally {
      setIsCreating(false);
    }
  };

  const currentSeries = series.find(s => s.id === currentSeriesId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Film className="w-4 h-4 flex-shrink-0" />
          <div className="text-left min-w-0 flex-1">
            <div className="text-xs font-medium opacity-80">Current Series</div>
            <div className="text-sm font-semibold truncate">
              {currentSeries?.name || 'No series selected'}
            </div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-96 overflow-y-auto">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                Your Series
              </div>
              {series.map((s) => (
                <div
                  key={s.id}
                  className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    s.id === currentSeriesId
                      ? 'bg-blue-50 text-scripps-blue'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <button
                    onClick={() => {
                      onSeriesChange(s.id);
                      setIsOpen(false);
                    }}
                    className="flex-1 flex items-center gap-3 min-w-0"
                  >
                    <Film className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium truncate">{s.name}</div>
                      <div className="text-xs text-gray-500 truncate">{s.theme}</div>
                    </div>
                    {s.id === currentSeriesId && (
                      <Check className="w-4 h-4 flex-shrink-0" />
                    )}
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setManagingSeries(s);
                        setIsOpen(false);
                      }}
                      className="p-1.5 hover:bg-blue-100 rounded transition-all"
                      title="Edit series"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setManagingSeries(s);
                        setIsOpen(false);
                      }}
                      className="p-1.5 hover:bg-blue-100 rounded transition-all"
                      title="More options"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {archivedSeries.length > 0 && (
                <div className="border-t border-gray-200 mt-2">
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 transition-colors"
                  >
                    <span>Archived Series ({archivedSeries.length})</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showArchived ? 'rotate-180' : ''}`} />
                  </button>
                  {showArchived && (
                    <div className="px-2 pb-2">
                      {archivedSeries.map((s) => (
                        <div
                          key={s.id}
                          className="group relative flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Archive className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 text-left min-w-0">
                            <div className="font-medium truncate text-gray-500">{s.name}</div>
                            <div className="text-xs text-gray-400 truncate">
                              Archived {s.archived_at ? new Date(s.archived_at).toLocaleDateString() : ''}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRestoreSeries(s.id)}
                            disabled={restoringId === s.id}
                            className="p-1.5 hover:bg-green-100 rounded transition-all disabled:opacity-50"
                            title="Restore series"
                          >
                            {restoringId === s.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-green-600" />
                            ) : (
                              <ArchiveRestore className="w-3.5 h-3.5 text-green-600" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {series.length > 0 && (
                <div className="border-t border-gray-200 mt-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                    Quick Actions
                  </div>
                  <div className="px-2 pb-2 space-y-1">
                    {currentSeries && (
                      <>
                        <button
                          onClick={() => {
                            setManagingSeries(currentSeries);
                            setIsOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded-lg transition-colors text-left"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                          <span className="text-gray-700">Edit Current Series</span>
                        </button>
                        <button
                          onClick={() => {
                            setManagingSeries(currentSeries);
                            setIsOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded-lg transition-colors text-left"
                        >
                          <Copy className="w-4 h-4 text-green-600" />
                          <span className="text-gray-700">Duplicate Series</span>
                        </button>
                        <button
                          onClick={() => {
                            setManagingSeries(currentSeries);
                            setIsOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 rounded-lg transition-colors text-left"
                        >
                          <Archive className="w-4 h-4 text-red-600" />
                          <span className="text-gray-700">Archive Series</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 mt-2 pt-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                  Create New Series
                </div>
                <div className="px-3 py-2">
                  <input
                    type="text"
                    placeholder="Series name (e.g., Space Adventures)"
                    value={newSeriesName}
                    onChange={(e) => setNewSeriesName(e.target.value)}
                    className="w-full px-3 py-2 mb-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                    disabled={isCreating}
                  />
                  <input
                    type="text"
                    placeholder="Theme (e.g., Sci-Fi Animation)"
                    value={newSeriesTheme}
                    onChange={(e) => setNewSeriesTheme(e.target.value)}
                    className="w-full px-3 py-2 mb-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                    disabled={isCreating}
                  />
                  <button
                    onClick={createSeries}
                    disabled={isCreating || !newSeriesName.trim()}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-scripps-blue text-white text-sm font-medium rounded-lg hover:bg-scripps-navy transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Series
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {managingSeries && (
        <SeriesManagementModal
          series={managingSeries}
          onClose={() => setManagingSeries(null)}
          onUpdate={() => {
            fetchSeries();
            fetchArchivedSeries();
          }}
        />
      )}
    </div>
  );
}
