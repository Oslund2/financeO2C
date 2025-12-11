import { useState, useEffect } from 'react';
import { Film, Check, Plus, ChevronDown, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import { SeriesManagementModal } from './SeriesManagementModal';

interface Series {
  id: string;
  name: string;
  description: string | null;
  theme: string;
  style_guide: string;
  organization_id: string;
}

interface SeriesSwitcherProps {
  currentSeriesId: string | null;
  onSeriesChange: (seriesId: string) => void;
}

export function SeriesSwitcher({ currentSeriesId, onSeriesChange }: SeriesSwitcherProps) {
  const { currentOrganization } = useOrganization();
  const [series, setSeries] = useState<Series[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newSeriesTheme, setNewSeriesTheme] = useState('');
  const [managingSeries, setManagingSeries] = useState<Series | null>(null);

  useEffect(() => {
    if (currentOrganization) {
      fetchSeries();
    }
  }, [currentOrganization]);

  const fetchSeries = async () => {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSeries(data || []);
    } catch (error) {
      console.error('Error fetching series:', error);
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
                  className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setManagingSeries(s);
                      setIsOpen(false);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
                    title="Manage series"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <div className="border-t border-gray-200 mt-2 pt-2">
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
          }}
        />
      )}
    </div>
  );
}
