import { useState, useEffect } from 'react';
import { X, Search, BarChart2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { syntheticAudienceService, FocusGroup } from '../services/syntheticAudienceService';

interface ScriptOption {
  id: string;
  title: string;
  episode_number: number | null;
  season_number: number;
  status: string;
}

interface ScriptCompareModalProps {
  focusGroup: FocusGroup;
  organizationId: string;
  primaryScriptTitle: string;
  onClose: () => void;
  onComplete: (updated: FocusGroup) => void;
}

export default function ScriptCompareModal({
  focusGroup, organizationId, primaryScriptTitle, onClose, onComplete,
}: ScriptCompareModalProps) {
  const [scripts, setScripts] = useState<ScriptOption[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ScriptOption | null>(null);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('scripts')
      .select('id, title, episode_number, season_number, status')
      .eq('organization_id', organizationId)
      .neq('id', focusGroup.scriptId)
      .order('updated_at', { ascending: false })
      .then(({ data }) => setScripts((data ?? []) as ScriptOption[]));
  }, [organizationId, focusGroup.scriptId]);

  const filtered = scripts.filter(s =>
    s.title.toLowerCase().includes(query.toLowerCase())
  );

  async function handleCompare() {
    if (!selected) return;
    setError(null);
    setComparing(true);
    try {
      // Load comparison script content
      const [{ data: acts }, { data: script }] = await Promise.all([
        supabase
          .from('script_acts')
          .select('*, scenes:script_scenes(*)')
          .eq('script_id', selected.id)
          .order('act_number', { ascending: true }),
        supabase.from('scripts').select('title').eq('id', selected.id).single(),
      ]);

      const comparisonContent: Record<string, unknown> = {
        title: script?.title ?? selected.title,
        acts: (acts ?? []).map((act: any) => ({
          ...act,
          scenes: act.scenes ?? [],
        })),
      };

      const updated = await syntheticAudienceService.runComparison(
        focusGroup.id,
        selected.id,
        comparisonContent
      );
      onComplete(updated);
    } catch (err: any) {
      setError(err.message);
      setComparing(false);
    }
  }

  const personaNames = focusGroup.phase2Personas?.map(p => p.name).join(', ') ?? '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-500" />
            <h2 className="font-semibold text-gray-900">Compare Scripts</h2>
          </div>
          <button onClick={onClose} disabled={comparing} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Context */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-600 font-medium mb-0.5">Script A (current)</p>
              <p className="text-sm font-medium text-gray-900 truncate">{primaryScriptTitle}</p>
            </div>
            <div className={`p-3 rounded-lg border-2 ${selected ? 'border-indigo-300 bg-indigo-50' : 'border-dashed border-gray-300 bg-gray-50'}`}>
              <p className="text-xs text-gray-500 font-medium mb-0.5">Script B</p>
              {selected
                ? <p className="text-sm font-medium text-gray-900 truncate">{selected.title}</p>
                : <p className="text-sm text-gray-400">Select below</p>
              }
            </div>
          </div>

          {/* Shared personas note */}
          <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <p>
              The <strong>same 5 personas</strong> ({personaNames}) will watch both scripts, keeping the comparison fair.
            </p>
          </div>

          {/* Script search */}
          <div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search scripts…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-1">
              {filtered.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No other scripts found</p>
              )}
              {filtered.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    selected?.id === s.id
                      ? 'bg-indigo-100 text-indigo-800 font-medium'
                      : 'hover:bg-gray-50 text-gray-800'
                  }`}
                >
                  <span className="font-medium">{s.title}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    S{s.season_number}{s.episode_number ? `E${s.episode_number}` : ''} · {s.status}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} disabled={comparing} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30">
            Cancel
          </button>
          <button
            onClick={handleCompare}
            disabled={!selected || comparing}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {comparing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Comparing…</>
              : <><BarChart2 className="w-4 h-4" /> Run Comparison</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
