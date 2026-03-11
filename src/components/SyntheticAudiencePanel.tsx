import { useState, useEffect, useCallback } from 'react';
import {
  Users, Play, RefreshCw, ChevronDown, ChevronUp, CheckCircle,
  AlertCircle, Loader2, X, Save, Trash2, BookOpen, Zap, Trophy,
  TrendingUp, MessageSquare, Eye, EyeOff, Star, BarChart2, Plus,
} from 'lucide-react';
import {
  syntheticAudienceService,
  FocusGroup, FocusGroupStatus, Persona, HeatmapRow,
  Phase3Discussion, HeadToHeadSummary, AudiencePanel,
} from '../services/syntheticAudienceService';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface SyntheticAudiencePanelProps {
  scriptId: string;
  organizationId: string;
  scriptContent?: Record<string, unknown>;
  seriesId?: string;
  onCompareRequest?: (focusGroup: FocusGroup) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small display helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<FocusGroupStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:               { label: 'Pending',               color: 'bg-gray-100 text-gray-600',    icon: <Play className="w-3 h-3" /> },
  analyzing:             { label: 'Analyzing Script…',     color: 'bg-blue-100 text-blue-700',    icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  awaiting_confirmation: { label: 'Awaiting Confirmation', color: 'bg-amber-100 text-amber-700',  icon: <Users className="w-3 h-3" /> },
  simulating:            { label: 'Running Simulation…',   color: 'bg-purple-100 text-purple-700',icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  comparing:             { label: 'Comparing Scripts…',    color: 'bg-indigo-100 text-indigo-700',icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  complete:              { label: 'Complete',               color: 'bg-green-100 text-green-700',  icon: <CheckCircle className="w-3 h-3" /> },
  failed:                { label: 'Failed',                 color: 'bg-red-100 text-red-700',      icon: <AlertCircle className="w-3 h-3" /> },
};

function StatusBadge({ status }: { status: FocusGroupStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-6 text-right">{score}</span>
    </div>
  );
}

function PhaseProgress({ status }: { status: FocusGroupStatus }) {
  const steps = ['Analysis', 'Personas', 'Simulation', 'Report'];
  const stepIndex: Record<FocusGroupStatus, number> = {
    pending: -1, analyzing: 0, awaiting_confirmation: 1,
    simulating: 2, comparing: 2, complete: 3, failed: -1,
  };
  const active = stepIndex[status];
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div key={s} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              done ? 'bg-green-100 text-green-700' :
              current ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-400'
            }`}>
              {done ? <CheckCircle className="w-3 h-3" /> : <span className="w-3 h-3 flex items-center justify-center font-bold">{i + 1}</span>}
              {s}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-4 ${done ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Persona Card (editable)
// ─────────────────────────────────────────────────────────────────────────────

function PersonaCard({
  persona, index, editable, onChange,
}: {
  persona: Persona; index: number; editable: boolean;
  onChange?: (updated: Persona) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Persona>(persona);

  function save() {
    onChange?.(draft);
    setEditing(false);
  }

  const avatarColors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-rose-500',
  ];

  if (editing && editable) {
    return (
      <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {(['name', 'age', 'location'] as const).map(field => (
            <div key={field}>
              <label className="text-xs text-gray-500 capitalize">{field}</label>
              <input
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5"
                value={String(draft[field])}
                onChange={e => setDraft(p => ({ ...p, [field]: field === 'age' ? Number(e.target.value) : e.target.value }))}
              />
            </div>
          ))}
        </div>
        {(['viewing_habits', 'core_bias', 'why_click'] as const).map(field => (
          <div key={field}>
            <label className="text-xs text-gray-500">
              {field === 'viewing_habits' ? 'Viewing Habits' : field === 'core_bias' ? 'Core Bias' : 'Why They\'d Click'}
            </label>
            <textarea
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5 resize-none"
              rows={2}
              value={draft[field]}
              onChange={e => setDraft(p => ({ ...p, [field]: e.target.value }))}
            />
          </div>
        ))}
        <div className="flex gap-2 justify-end">
          <button onClick={() => setEditing(false)} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
          <button onClick={save} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-2 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full ${avatarColors[index]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
            {persona.name[0]}
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">{persona.name}, {persona.age}</p>
            <p className="text-xs text-gray-500">{persona.location}</p>
          </div>
        </div>
        {editable && (
          <button onClick={() => setEditing(true)} className="text-xs text-blue-600 hover:underline">Edit</button>
        )}
      </div>
      <div className="space-y-1.5 text-xs">
        <div>
          <span className="font-medium text-gray-600">Viewing habits: </span>
          <span className="text-gray-700">{persona.viewing_habits}</span>
        </div>
        <div>
          <span className="font-medium text-gray-600">Core bias: </span>
          <span className="text-gray-700">{persona.core_bias}</span>
        </div>
        <div className="bg-gray-50 rounded p-2 italic text-gray-600">
          "{persona.why_click}"
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Heatmap Table
// ─────────────────────────────────────────────────────────────────────────────

function HeatmapTable({ heatmap, title }: { heatmap: HeatmapRow[]; title?: string }) {
  const avgPacing = (heatmap.reduce((s, r) => s + r.pacing_score, 0) / heatmap.length).toFixed(1);
  const avgRelate = (heatmap.reduce((s, r) => s + r.character_relatability, 0) / heatmap.length).toFixed(1);
  const ep2Count = heatmap.filter(r => r.will_watch_ep2).length;

  return (
    <div className="space-y-3">
      {title && <h4 className="font-medium text-sm text-gray-800">{title}</h4>}
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className={`text-2xl font-bold ${Number(avgPacing) >= 7 ? 'text-green-600' : Number(avgPacing) >= 5 ? 'text-amber-600' : 'text-red-600'}`}>{avgPacing}</p>
          <p className="text-xs text-gray-500 mt-0.5">Avg Pacing</p>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <p className={`text-2xl font-bold ${Number(avgRelate) >= 7 ? 'text-green-600' : Number(avgRelate) >= 5 ? 'text-amber-600' : 'text-red-600'}`}>{avgRelate}</p>
          <p className="text-xs text-gray-500 mt-0.5">Avg Relatability</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className={`text-2xl font-bold ${ep2Count >= 4 ? 'text-green-600' : ep2Count >= 3 ? 'text-amber-600' : 'text-red-600'}`}>{ep2Count}/5</p>
          <p className="text-xs text-gray-500 mt-0.5">Watch EP 2</p>
        </div>
      </div>
      {/* Per-persona table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-200">
              <th className="text-left py-2 pr-4">Persona</th>
              <th className="text-left py-2 pr-4 w-32">Pacing</th>
              <th className="text-left py-2 pr-4 w-32">Relatability</th>
              <th className="text-left py-2">Watch EP 2?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {heatmap.map(row => (
              <tr key={row.persona_name}>
                <td className="py-2 pr-4 font-medium text-gray-900">{row.persona_name}</td>
                <td className="py-2 pr-4"><ScoreBar score={row.pacing_score} /></td>
                <td className="py-2 pr-4"><ScoreBar score={row.character_relatability} /></td>
                <td className="py-2">
                  <div>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${row.will_watch_ep2 ? 'text-green-700' : 'text-red-600'}`}>
                      {row.will_watch_ep2 ? <CheckCircle className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {row.will_watch_ep2 ? 'Yes' : 'No'}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">{row.retention_reason}</p>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Discussion Transcript (Phase 3)
// ─────────────────────────────────────────────────────────────────────────────

function DiscussionSection({ discussion }: { discussion: Phase3Discussion }) {
  const [openSection, setOpenSection] = useState<string | null>('hook');

  const verdictColors = {
    authentic: 'bg-green-100 text-green-700',
    cringe: 'bg-red-100 text-red-700',
    forced: 'bg-amber-100 text-amber-700',
  };

  const predictabilityColor = (score: number) =>
    score >= 8 ? 'bg-red-100 text-red-700' : score >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';

  const sections = [
    {
      key: 'hook',
      label: 'Hook Moments',
      icon: <Zap className="w-4 h-4" />,
      content: (
        <div className="space-y-3">
          {discussion.hook_moments.map((m, i) => (
            <div key={i} className={`p-3 rounded-lg border ${m.decision === 'continue' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{m.persona_name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.decision === 'continue' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                  {m.decision === 'continue' ? '▶ Kept watching' : '✕ Turned off'}
                </span>
              </div>
              <p className="text-xs text-gray-700 italic mb-1">"{m.moment}"</p>
              <p className="text-xs text-gray-600">{m.reason}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'dialogue',
      label: 'Dialogue Authenticity',
      icon: <MessageSquare className="w-4 h-4" />,
      content: (
        <div className="space-y-3">
          {discussion.dialogue_critique.map((c, i) => (
            <div key={i} className="p-3 rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm">{c.persona_name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${verdictColors[c.verdict]}`}>
                  {c.verdict}
                </span>
              </div>
              <p className="text-xs font-mono bg-gray-50 p-2 rounded border border-gray-200 mb-2">"{c.line}"</p>
              <p className="text-xs text-gray-600">{c.reaction}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'twist',
      label: 'Twist Predictions',
      icon: <Star className="w-4 h-4" />,
      content: (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 italic">Predictability: 1 = creatively unique guess, 10 = obvious from the script. Scores above 7 signal the twist is telegraphed.</p>
          {discussion.twist_predictions.map((t, i) => (
            <div key={i} className="p-3 rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{t.persona_name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${predictabilityColor(t.predictability_score)}`}>
                  Predictability {t.predictability_score}/10
                </span>
              </div>
              <p className="text-xs text-gray-700">"{t.prediction}"</p>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-2">
      {sections.map(s => (
        <div key={s.key} className="border border-gray-200 rounded-lg">
          <button
            onClick={() => setOpenSection(openSection === s.key ? null : s.key)}
            className="w-full flex items-center justify-between p-3 text-left"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
              {s.icon}{s.label}
            </div>
            {openSection === s.key ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {openSection === s.key && <div className="p-3 pt-0">{s.content}</div>}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Head-to-Head Summary
// ─────────────────────────────────────────────────────────────────────────────

function HeadToHead({ summary, titleA, titleB }: { summary: HeadToHeadSummary; titleA: string; titleB: string }) {
  const isA = summary.winner === 'A';
  const isTie = summary.winner === 'tie';
  const winnerTitle = isTie ? 'Tie' : (isA ? titleA : titleB);
  const marginColors = { close: 'text-amber-600', moderate: 'text-orange-600', decisive: 'text-red-600' };

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl border-2 text-center ${isTie ? 'border-gray-300 bg-gray-50' : 'border-green-300 bg-green-50'}`}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Trophy className={`w-5 h-5 ${isTie ? 'text-gray-500' : 'text-green-600'}`} />
          <span className="font-bold text-lg text-gray-900">{isTie ? 'It\'s a Tie' : winnerTitle}</span>
        </div>
        <p className={`text-sm font-medium ${marginColors[summary.margin]}`}>
          {summary.margin.charAt(0).toUpperCase() + summary.margin.slice(1)} margin
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          { label: titleA, pacing: summary.average_pacing_a, retention: summary.ep2_retention_a, isWinner: summary.winner === 'A' },
          { label: titleB, pacing: summary.average_pacing_b, retention: summary.ep2_retention_b, isWinner: summary.winner === 'B' },
        ].map(({ label, pacing, retention, isWinner }) => (
          <div key={label} className={`p-3 rounded-lg border ${isWinner && !isTie ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <p className="font-medium text-xs text-gray-700 mb-2 truncate">{label}</p>
            <p className="text-xs text-gray-500">Avg pacing <span className="font-bold text-gray-800">{pacing.toFixed(1)}</span></p>
            <p className="text-xs text-gray-500">EP2 retention <span className="font-bold text-gray-800">{retention}/5</span></p>
          </div>
        ))}
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Key Differentiators</h4>
        <ul className="space-y-1">
          {summary.key_differentiators.map((d, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <TrendingUp className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
              {d}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs font-semibold text-blue-800 mb-1">Recommendation</p>
        <p className="text-sm text-blue-700">{summary.recommendation}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Focus Group Result Card
// ─────────────────────────────────────────────────────────────────────────────

function FocusGroupCard({
  fg, scriptTitle, onDelete, onCompare,
}: {
  fg: FocusGroup; scriptTitle: string; onDelete: () => void; onCompare: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPhase, setShowPhase] = useState<'heatmap' | 'discussion' | 'comparison'>('heatmap');

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-start justify-between p-4 bg-white">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={fg.status} />
            {fg.status === 'complete' && fg.headToHeadSummary && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                vs. comparison
              </span>
            )}
          </div>
          <p className="font-medium text-sm text-gray-900 truncate">{fg.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{new Date(fg.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-1 ml-3">
          {fg.status === 'complete' && (
            <button
              onClick={onCompare}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              title="Compare with another script"
            >
              <BarChart2 className="w-3 h-3" /> Compare
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
          >
            {expanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && fg.status === 'complete' && (
        <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
          {/* Phase 1: Script Analysis */}
          {fg.phase1Analysis && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-gray-800 mb-3 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-500" /> Script Analysis
              </h4>
              <div className="space-y-2 text-sm">
                <div><span className="text-xs font-semibold text-gray-500 uppercase">Premise</span><p className="text-gray-800 mt-0.5">{fg.phase1Analysis.core_premise}</p></div>
                <div><span className="text-xs font-semibold text-gray-500 uppercase">Tone</span><p className="text-gray-800 mt-0.5">{fg.phase1Analysis.tone}</p></div>
                <div><span className="text-xs font-semibold text-gray-500 uppercase">Target Demo</span><p className="text-gray-800 mt-0.5">{fg.phase1Analysis.target_demographic}</p></div>
                {fg.phase1Analysis.polarizing_points?.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase">Polarizing Points</span>
                    <div className="mt-1 space-y-1">
                      {fg.phase1Analysis.polarizing_points.map((p, i) => (
                        <div key={i} className="text-xs p-2 bg-amber-50 border border-amber-100 rounded">
                          <span className="font-medium">{p.subject}: </span>{p.why_polarizing}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phase 2: Personas */}
          {fg.phase2Personas && (
            <div>
              <h4 className="font-semibold text-sm text-gray-800 mb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-500" /> Synthetic Audience
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {fg.phase2Personas.map((p, i) => (
                  <PersonaCard key={i} persona={p} index={i} editable={false} />
                ))}
              </div>
            </div>
          )}

          {/* Phase 3+4 tabs */}
          <div>
            <div className="flex gap-1 mb-3">
              {(['heatmap', 'discussion'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setShowPhase(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    showPhase === tab ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab === 'heatmap' ? 'Heatmap Report' : 'Table Read'}
                </button>
              ))}
              {fg.headToHeadSummary && (
                <button
                  onClick={() => setShowPhase('comparison')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    showPhase === 'comparison' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Head-to-Head
                </button>
              )}
            </div>

            {showPhase === 'heatmap' && fg.phase4Heatmap && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <HeatmapTable heatmap={fg.phase4Heatmap} />
              </div>
            )}
            {showPhase === 'discussion' && fg.phase3Discussion && (
              <DiscussionSection discussion={fg.phase3Discussion} />
            )}
            {showPhase === 'comparison' && fg.headToHeadSummary && fg.phase4Heatmap && fg.comparisonPhase4 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-6">
                <HeadToHead
                  summary={fg.headToHeadSummary}
                  titleA={fg.title?.split(' — Focus Group')[0] || 'Script A'}
                  titleB="Script B"
                />
                <div className="border-t border-gray-200 pt-4 space-y-4">
                  <HeatmapTable heatmap={fg.phase4Heatmap} title={fg.title?.split(' — Focus Group')[0] || 'Script A'} />
                  <HeatmapTable heatmap={fg.comparisonPhase4} title="Script B" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active-state spinners */}
      {(fg.status === 'analyzing' || fg.status === 'simulating' || fg.status === 'comparing') && (
        <div className="border-t border-gray-100 p-3 bg-gray-50 flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          {STATUS_CONFIG[fg.status].label}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// New Focus Group Flow (inline)
// ─────────────────────────────────────────────────────────────────────────────

function NewGroupFlow({
  scriptId, organizationId, scriptContent, panels,
  onCreated, onCancel,
}: {
  scriptId: string; organizationId: string; scriptContent: Record<string, unknown>;
  panels: AudiencePanel[]; onCreated: (fg: FocusGroup) => void; onCancel: () => void;
}) {
  const [step, setStep] = useState<'config' | 'analyzing' | 'confirming' | 'simulating'>('config');
  const [panelChoice, setPanelChoice] = useState<'new' | string>('new');
  const [focusGroup, setFocusGroup] = useState<FocusGroup | null>(null);
  const [editedPersonas, setEditedPersonas] = useState<Persona[]>([]);
  const [savePanelName, setSavePanelName] = useState('');
  const [wantSavePanel, setWantSavePanel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setError(null);
    setStep('analyzing');
    try {
      const panelId = panelChoice === 'new' ? undefined : panelChoice;
      const fg = await syntheticAudienceService.startAnalysis(scriptId, organizationId, scriptContent, panelId);
      setFocusGroup(fg);
      setEditedPersonas(fg.phase2Personas ?? []);
      setStep('confirming');
    } catch (err: any) {
      setError(err.message);
      setStep('config');
    }
  }

  async function handleConfirmAndRun() {
    if (!focusGroup) return;
    setError(null);
    setStep('simulating');
    try {
      const saveAs = wantSavePanel && savePanelName
        ? { organizationId, name: savePanelName }
        : undefined;
      await syntheticAudienceService.confirmPersonas(focusGroup.id, editedPersonas, saveAs);
      const completed = await syntheticAudienceService.runSimulation(focusGroup.id, scriptContent);
      onCreated(completed);
    } catch (err: any) {
      setError(err.message);
      setStep('confirming');
    }
  }

  if (step === 'config') {
    return (
      <div className="border border-blue-200 bg-blue-50 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" /> New Focus Group Test
        </h3>

        {error && (
          <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Audience</label>
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
              <input type="radio" name="panel" value="new" checked={panelChoice === 'new'}
                onChange={() => setPanelChoice('new')} className="mt-0.5" />
              <div>
                <p className="font-medium text-sm text-gray-800">Generate fresh personas</p>
                <p className="text-xs text-gray-500">AI creates 5 new audience members tailored to this script's genre and tone</p>
              </div>
            </label>
            {panels.map(panel => (
              <label key={panel.id} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                <input type="radio" name="panel" value={panel.id} checked={panelChoice === panel.id}
                  onChange={() => setPanelChoice(panel.id)} className="mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-gray-800">{panel.name}</p>
                  <p className="text-xs text-gray-500">{panel.personas.map(p => p.name).join(', ')} — saved panel</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleStart}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Play className="w-4 h-4" /> Analyze Script
          </button>
        </div>
      </div>
    );
  }

  if (step === 'analyzing') {
    return (
      <div className="border border-blue-200 bg-blue-50 rounded-xl p-8 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
        <p className="font-medium text-gray-800">Analyzing script & generating personas…</p>
        <p className="text-sm text-gray-500">Phase 1: Script analysis · Phase 2: Audience generation</p>
      </div>
    );
  }

  if (step === 'confirming' && focusGroup) {
    return (
      <div className="border border-amber-200 bg-amber-50 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-600" /> Review Your Audience
          </h3>
          <PhaseProgress status="awaiting_confirmation" />
        </div>

        {/* Phase 1 summary */}
        {focusGroup.phase1Analysis && (
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm space-y-1">
            <p className="font-medium text-gray-700">Script: {focusGroup.phase1Analysis.tone}</p>
            <p className="text-gray-600 text-xs">{focusGroup.phase1Analysis.target_demographic}</p>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-700 mb-3">
            Review and edit these personas before the simulation runs. Their biases shape every result.
          </p>
          <div className="space-y-3">
            {editedPersonas.map((p, i) => (
              <PersonaCard
                key={i} persona={p} index={i} editable
                onChange={updated => setEditedPersonas(prev => prev.map((ep, j) => j === i ? updated : ep))}
              />
            ))}
          </div>
        </div>

        {/* Save as panel option */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={wantSavePanel} onChange={e => setWantSavePanel(e.target.checked)} className="rounded" />
            <span className="text-sm text-gray-700">Save these personas as a reusable Audience Panel</span>
          </label>
          {wantSavePanel && (
            <input
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              placeholder="Panel name (e.g. Gen Z Drama Watchers)"
              value={savePanelName}
              onChange={e => setSavePanelName(e.target.value)}
            />
          )}
        </div>

        {error && (
          <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button
            onClick={handleConfirmAndRun}
            className="flex items-center gap-2 px-5 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
          >
            <Play className="w-4 h-4" /> Confirm & Run Simulation
          </button>
        </div>
      </div>
    );
  }

  if (step === 'simulating') {
    return (
      <div className="border border-purple-200 bg-purple-50 rounded-xl p-8 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
        <p className="font-medium text-gray-800">Running simulated table read…</p>
        <p className="text-sm text-gray-500">Phase 3: Discussion transcript · Phase 4: Heatmap report</p>
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Panel
// ─────────────────────────────────────────────────────────────────────────────

export default function SyntheticAudiencePanel({
  scriptId, organizationId, scriptContent, onCompareRequest,
}: SyntheticAudiencePanelProps) {
  const [focusGroups, setFocusGroups] = useState<FocusGroup[]>([]);
  const [panels, setPanels] = useState<AudiencePanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [fgs, ps] = await Promise.all([
        syntheticAudienceService.getFocusGroupsForScript(scriptId),
        syntheticAudienceService.getPanels(organizationId),
      ]);
      setFocusGroups(fgs);
      setPanels(ps);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [scriptId, organizationId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleDelete(id: string) {
    try {
      await syntheticAudienceService.deleteFocusGroup(id);
      setFocusGroups(prev => prev.filter(fg => fg.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleCreated(fg: FocusGroup) {
    setCreating(false);
    setFocusGroups(prev => [fg, ...prev]);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  const scriptTitle = (scriptContent?.title as string) || 'Script';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" /> Synthetic Audience Testing
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            AI-generated focus group evaluates your script across 4 research phases
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              disabled={!scriptContent}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title={!scriptContent ? 'Script content must be loaded' : 'Run a new focus group test'}
            >
              <Plus className="w-4 h-4" /> New Test
            </button>
          )}
        </div>
      </div>

      {/* Saved panels summary */}
      {panels.length > 0 && !creating && (
        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
          <Save className="w-3 h-3" />
          <span>Saved panels:</span>
          {panels.map(p => (
            <span key={p.id} className="px-2 py-0.5 bg-gray-100 rounded-full text-gray-700">{p.name}</span>
          ))}
        </div>
      )}

      {error && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Inline new group flow */}
      {creating && scriptContent && (
        <NewGroupFlow
          scriptId={scriptId}
          organizationId={organizationId}
          scriptContent={scriptContent}
          panels={panels}
          onCreated={handleCreated}
          onCancel={() => setCreating(false)}
        />
      )}

      {/* Existing focus groups */}
      {focusGroups.length > 0 && (
        <div className="space-y-3">
          {focusGroups.map(fg => (
            <FocusGroupCard
              key={fg.id}
              fg={fg}
              scriptTitle={scriptTitle}
              onDelete={() => handleDelete(fg.id)}
              onCompare={() => onCompareRequest?.(fg)}
            />
          ))}
        </div>
      )}

      {focusGroups.length === 0 && !creating && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-600">No focus group tests yet</p>
          <p className="text-sm mt-1 mb-4">Run a test to get AI-powered audience insights in 4 phases</p>
          {scriptContent && (
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              <Play className="w-4 h-4" /> Run First Test
            </button>
          )}
          {!scriptContent && (
            <p className="text-xs text-gray-400">Script content must be loaded to run a test</p>
          )}
        </div>
      )}
    </div>
  );
}
