import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { loadProfile } from '@/utils/persuasionEngine';
import { PersuasionTechnique, TECHNIQUE_LIBRARY } from '@/types/persuasionEngine';
import { getShadowState } from '@/utils/shadowQuests';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

// ── Helpers ──────────────────────────────────────────────────────────

const OUTCOME_LOG_KEY = 'systemPersuasionOutcomes';
const PRECOMMIT_KEY = 'systemPreCommitment';
const PRECOMMIT_HISTORY_KEY = 'systemPreCommitHistory';

interface OutcomeEntry {
  technique: PersuasionTechnique;
  completed: boolean;
  responseTimeMinutes: number;
  timestamp: string;
  questName?: string;
  message?: string;
}

function loadOutcomeLog(): OutcomeEntry[] {
  try {
    const raw = localStorage.getItem(OUTCOME_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function loadPreCommitHistory(): any[] {
  try {
    // Gather from current + any stored history
    const current = localStorage.getItem(PRECOMMIT_KEY);
    const history = localStorage.getItem(PRECOMMIT_HISTORY_KEY);
    const items: any[] = history ? JSON.parse(history) : [];
    if (current) {
      const c = JSON.parse(current);
      if (!items.find((h: any) => h.date === c.date)) items.push(c);
    }
    return items;
  } catch { return []; }
}

const TECHNIQUE_LABELS: Record<PersuasionTechnique, string> = {
  loss_aversion: 'Loss Aversion',
  variable_reward: 'Variable Reward',
  identity_framing: 'Identity Framing',
  commitment_escalation: 'Commitment',
  social_proof: 'Social Proof',
  temporal_landmark: 'Temporal Landmark',
  endowed_progress: 'Endowed Progress',
  scarcity_window: 'Scarcity',
  contrast_principle: 'Contrast',
  sunk_cost_leverage: 'Sunk Cost',
  implementation_intention: 'Implementation',
  fresh_start_effect: 'Fresh Start',
};

// ── Component ────────────────────────────────────────────────────────

const SystemAnalytics = () => {
  const profile = useMemo(() => loadProfile(), []);
  const outcomeLog = useMemo(() => loadOutcomeLog(), []);
  const preCommitHistory = useMemo(() => loadPreCommitHistory(), []);
  const shadowState = useMemo(() => getShadowState(), []);

  // 1. Technique effectiveness data
  const techniqueData = useMemo(() => {
    const allTechniques: PersuasionTechnique[] = [
      'loss_aversion', 'variable_reward', 'identity_framing', 'commitment_escalation',
      'social_proof', 'temporal_landmark', 'endowed_progress', 'scarcity_window',
      'contrast_principle', 'sunk_cost_leverage', 'implementation_intention', 'fresh_start_effect',
    ];
    return allTechniques
      .map(t => {
        const eff = profile.techniqueEffectiveness[t];
        return {
          name: TECHNIQUE_LABELS[t],
          technique: t,
          rate: eff ? Math.round(eff.effectivenessRate * 100) : 50,
          uses: eff?.timesUsed ?? 0,
          completions: eff?.timesResultedInCompletion ?? 0,
        };
      })
      .sort((a, b) => b.rate - a.rate);
  }, [profile]);

  // 2. Radar chart data
  const radarData = useMemo(() => {
    const p = profile.playerProfile;
    const levelMap = { high: 3, medium: 2, low: 1 };
    return [
      { trait: 'Loss Aversion', value: levelMap[p.lossAversionSensitivity], level: p.lossAversionSensitivity },
      { trait: 'Competitive', value: levelMap[p.competitiveInstinct], level: p.competitiveInstinct },
      { trait: 'Identity', value: levelMap[p.identityAlignment], level: p.identityAlignment },
      { trait: 'Commitment', value: levelMap[p.commitmentConsistency], level: p.commitmentConsistency },
      { trait: 'Novelty', value: levelMap[p.noveltySeeker], level: p.noveltySeeker },
      { trait: 'Streak', value: levelMap[p.streakMotivated], level: p.streakMotivated },
    ];
  }, [profile]);

  // 3. Recent log (last 20)
  const recentLog = useMemo(() => outcomeLog.slice(-20).reverse(), [outcomeLog]);

  // 4. Habituation data
  const habituationData = useMemo(() => {
    const allTechniques: PersuasionTechnique[] = [
      'loss_aversion', 'variable_reward', 'identity_framing', 'commitment_escalation',
      'social_proof', 'temporal_landmark', 'endowed_progress', 'scarcity_window',
      'contrast_principle', 'sunk_cost_leverage', 'implementation_intention', 'fresh_start_effect',
    ];
    return allTechniques.map(t => {
      const hab = profile.habituationCounters[t];
      const eff = profile.techniqueEffectiveness[t];
      return {
        name: TECHNIQUE_LABELS[t],
        consecutive: hab?.consecutiveUses ?? 0,
        max: hab?.maxBeforeRotation ?? 3,
        lastUsed: eff?.lastUsed ? new Date(eff.lastUsed as any).toLocaleDateString() : 'Never',
        approaching: hab ? hab.consecutiveUses >= hab.maxBeforeRotation - 1 : false,
      };
    });
  }, [profile]);

  // 5. Pre-commitment stats
  const preCommitStats = useMemo(() => {
    const total = preCommitHistory.length;
    const accepted = preCommitHistory.filter((c: any) => c.accepted === true).length;
    const completed = preCommitHistory.filter((c: any) => c.completed === true).length;
    const broken = preCommitHistory.filter((c: any) => c.accepted === true && c.completed === false).length;
    return {
      total,
      acceptRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
      followThrough: accepted > 0 ? Math.round((completed / accepted) * 100) : 0,
      broken,
    };
  }, [preCommitHistory]);

  // 6. Shadow quest stats
  const shadowStats = useMemo(() => {
    const s = shadowState.stats;
    return {
      total: s.totalGenerated,
      completed: s.totalCompleted,
      expired: s.totalExpired,
      completionRate: s.totalGenerated > 0 ? Math.round(s.completionRate * 100) : 0,
      difficultyMod: s.difficultyModifier,
    };
  }, [shadowState]);

  // 7. Weekly insight
  const weeklyInsight = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekEntries = outcomeLog.filter(e => new Date(e.timestamp) > weekAgo);

    if (weekEntries.length < 3) return 'Not enough data yet. Complete more quests to generate insights.';

    // Find most effective technique this week
    const byTechnique: Record<string, { completed: number; total: number }> = {};
    for (const e of weekEntries) {
      if (!byTechnique[e.technique]) byTechnique[e.technique] = { completed: 0, total: 0 };
      byTechnique[e.technique].total++;
      if (e.completed) byTechnique[e.technique].completed++;
    }

    const sorted = Object.entries(byTechnique)
      .map(([t, d]) => ({ technique: t as PersuasionTechnique, rate: d.total > 0 ? d.completed / d.total : 0, ...d }))
      .sort((a, b) => b.rate - a.rate);

    const best = sorted[0];
    const worst = sorted.length > 1 ? sorted[sorted.length - 1] : null;

    let insight = `This week, ${TECHNIQUE_LABELS[best.technique]} was your most effective motivator (${Math.round(best.rate * 100)}% completion rate, ${best.total} uses).`;

    if (worst && worst.rate < 0.5) {
      insight += ` ${TECHNIQUE_LABELS[worst.technique]} showed declining effectiveness (${Math.round(worst.rate * 100)}%).`;
    }

    const p = profile.playerProfile;
    const highTraits = Object.entries(p).filter(([, v]) => v === 'high').map(([k]) => k);
    if (highTraits.length > 0) {
      insight += ` High-response traits: ${highTraits.map(t => t.replace(/([A-Z])/g, ' $1').trim()).join(', ')}.`;
    }

    return insight;
  }, [outcomeLog, profile]);

  function getBarColor(rate: number): string {
    if (rate > 70) return 'hsl(142 71% 45%)';
    if (rate >= 40) return 'hsl(48 96% 53%)';
    return 'hsl(0 84% 60%)';
  }

  return (
    <div className="min-h-screen bg-background pb-12 pt-6">
      <div className="mx-auto max-w-3xl px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/inventory" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-mono text-lg font-bold text-foreground">System Analytics</h1>
            <p className="font-mono text-xs text-muted-foreground">Persuasion Engine Performance Dashboard</p>
          </div>
        </div>

        {/* 1. Technique Effectiveness */}
        <Section title="Technique Effectiveness">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={techniqueData} layout="vertical" margin={{ left: 100, right: 40 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(215 20% 65%)', fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: 'hsl(215 20% 65%)', fontSize: 11, fontFamily: 'monospace' }}
                  width={95}
                />
                <Tooltip
                  contentStyle={{ background: 'hsl(240 20% 10%)', border: '1px solid hsl(240 15% 20%)', borderRadius: 8, fontFamily: 'monospace', fontSize: 12 }}
                  labelStyle={{ color: 'hsl(210 40% 98%)' }}
                  formatter={(value: number, _: string, props: any) => [`${value}% (${props.payload.uses} uses)`, 'Rate']}
                />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                  {techniqueData.map((entry, i) => (
                    <Cell key={i} fill={getBarColor(entry.rate)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* 2. Psychological Profile */}
        <Section title="Player Psychological Profile">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="hsl(240 15% 20%)" />
                <PolarAngleAxis
                  dataKey="trait"
                  tick={{ fill: 'hsl(215 20% 65%)', fontSize: 11, fontFamily: 'monospace' }}
                />
                <Radar
                  dataKey="value"
                  stroke="hsl(263 91% 66%)"
                  fill="hsl(263 91% 66%)"
                  fillOpacity={0.25}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {radarData.map(d => (
              <span key={d.trait} className="font-mono text-[10px] border border-border rounded px-2 py-1 text-muted-foreground">
                {d.trait}: <span className={d.level === 'high' ? 'text-green-400' : d.level === 'low' ? 'text-red-400' : 'text-yellow-400'}>{d.level}</span>
              </span>
            ))}
          </div>
        </Section>

        {/* 3. Technique Rotation Log */}
        <Section title="Technique Rotation Log (Last 20)">
          {recentLog.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground">No persuasion events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="pb-2 pr-3">Date</th>
                    <th className="pb-2 pr-3">Technique</th>
                    <th className="pb-2 pr-3">Outcome</th>
                    <th className="pb-2">Response</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLog.map((entry, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-1.5 pr-3 text-muted-foreground whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-1.5 pr-3 text-foreground">
                        {TECHNIQUE_LABELS[entry.technique] || entry.technique}
                      </td>
                      <td className="py-1.5 pr-3">
                        <span className={entry.completed ? 'text-green-400' : 'text-red-400'}>
                          {entry.completed ? '✓ completed' : '✗ skipped'}
                        </span>
                      </td>
                      <td className="py-1.5 text-muted-foreground">
                        {entry.responseTimeMinutes > 0 ? `${entry.responseTimeMinutes}m` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* 4. Habituation Monitor */}
        <Section title="Habituation Monitor">
          <div className="grid grid-cols-2 gap-2">
            {habituationData.map(h => (
              <div
                key={h.name}
                className={`rounded border p-2.5 font-mono text-xs ${
                  h.approaching ? 'border-red-500/40 bg-red-500/5' : 'border-border bg-card/30'
                }`}
              >
                <p className="text-foreground font-medium">{h.name}</p>
                <p className="text-muted-foreground mt-0.5">
                  Uses: {h.consecutive}/{h.max}
                  {h.approaching && <span className="text-red-400 ml-1">⚠ rotate</span>}
                </p>
                <p className="text-muted-foreground/60 text-[10px]">Last: {h.lastUsed}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 5. Pre-Commitment Stats */}
        <Section title="Pre-Commitment Stats">
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Total Offered" value={preCommitStats.total} />
            <StatBox label="Accept Rate" value={`${preCommitStats.acceptRate}%`} color={preCommitStats.acceptRate > 60 ? 'green' : 'yellow'} />
            <StatBox label="Follow-Through" value={`${preCommitStats.followThrough}%`} color={preCommitStats.followThrough > 70 ? 'green' : preCommitStats.followThrough > 40 ? 'yellow' : 'red'} />
            <StatBox label="Broken" value={preCommitStats.broken} color={preCommitStats.broken > 3 ? 'red' : 'default'} />
          </div>
        </Section>

        {/* 6. Shadow Quest Stats */}
        <Section title="Shadow Quest Stats">
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Total Spawned" value={shadowStats.total} />
            <StatBox label="Completed" value={shadowStats.completed} />
            <StatBox label="Completion Rate" value={`${shadowStats.completionRate}%`} color={shadowStats.completionRate > 60 ? 'green' : 'yellow'} />
            <StatBox label="Difficulty Mod" value={`${shadowStats.difficultyMod.toFixed(1)}x`} />
          </div>
        </Section>

        {/* 7. Weekly Insight */}
        <Section title="Weekly Insight">
          <p className="font-mono text-sm text-muted-foreground leading-relaxed">{weeklyInsight}</p>
        </Section>
      </div>
    </div>
  );
};

// ── Sub-components ───────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      <h2 className="font-mono text-sm font-bold text-foreground mb-3 tracking-wider">{title}</h2>
      {children}
    </div>
  );
}

function StatBox({ label, value, color = 'default' }: { label: string; value: string | number; color?: string }) {
  const colorClass = color === 'green' ? 'text-green-400' : color === 'yellow' ? 'text-yellow-400' : color === 'red' ? 'text-red-400' : 'text-foreground';
  return (
    <div className="rounded border border-border bg-background/50 p-3 text-center">
      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`font-mono text-lg font-bold ${colorClass} mt-1`}>{value}</p>
    </div>
  );
}

export default SystemAnalytics;
