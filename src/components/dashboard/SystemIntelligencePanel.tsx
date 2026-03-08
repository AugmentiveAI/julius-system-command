import { useState } from 'react';
import { Brain, TrendingUp, Target, Zap, ChevronDown, AlertTriangle, RefreshCw, Shield, Swords, Plus, Check } from 'lucide-react';
import { SystemIntelligence, DynamicChallenge, SuggestedShadow, SuggestedDungeon } from '@/types/systemIntelligence';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TrajectoryForecaster } from './TrajectoryForecaster';
import { getCategoryIcon } from '@/types/shadowArmy';

const DIFFICULTY_COLORS: Record<string, string> = {
  'B-Rank': 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  'A-Rank': 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  'S-Rank': 'text-red-400 border-red-400/30 bg-red-400/10',
};

const LEVERAGE_ICONS: Record<string, string> = {
  revenue: '💰',
  skill: '⚡',
  network: '🌐',
  systems: '⚙️',
  compound: '🔗',
};

const DUNGEON_TYPE_LABELS: Record<string, string> = {
  boss_fight: '⚔️ Boss Fight',
  instant_dungeon: '⚡ Instant Dungeon',
  s_rank_gate: '🔥 S-Rank Gate',
};

function ChallengeCard({ challenge, onComplete }: { challenge: DynamicChallenge; onComplete: (id: string) => void }) {
  const [completed, setCompleted] = useState(false);
  const colorClass = DIFFICULTY_COLORS[challenge.difficulty] || DIFFICULTY_COLORS['B-Rank'];

  return (
    <div
      className={`rounded-lg border p-4 space-y-2 transition-all ${
        completed
          ? 'border-primary/20 bg-primary/5 opacity-60'
          : 'border-border bg-card/80 hover:border-primary/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-block rounded px-1.5 py-0.5 font-mono text-[9px] tracking-wider border ${colorClass}`}>
              {challenge.difficulty}
            </span>
            <span className="font-mono text-[9px] text-muted-foreground">
              {LEVERAGE_ICONS[challenge.leverageType]} {challenge.timeEstimate}
            </span>
          </div>
          <p className={`font-tech text-sm ${completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {challenge.title}
          </p>
        </div>
        <button
          onClick={() => { setCompleted(true); onComplete(challenge.id); }}
          disabled={completed}
          className={`shrink-0 rounded-full h-7 w-7 flex items-center justify-center border transition-all ${
            completed
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border hover:border-primary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary'
          }`}
        >
          {completed ? '✓' : ''}
        </button>
      </div>
      <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
        {challenge.description}
      </p>
      <p className="font-mono text-[10px] text-primary">
        +{challenge.xpReward} XP
      </p>
    </div>
  );
}

function ShadowRecruitCard({ shadow, onAccept }: { shadow: SuggestedShadow; onAccept: () => void }) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className={`rounded-lg border p-4 space-y-2 transition-all ${
      accepted ? 'border-primary/20 bg-primary/5 opacity-60' : 'border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">{getCategoryIcon(shadow.category)}</span>
            <span className="font-mono text-[9px] tracking-wider text-purple-400 uppercase">{shadow.category}</span>
          </div>
          <p className={`font-tech text-sm ${accepted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {shadow.name}
          </p>
        </div>
        <button
          onClick={() => { setAccepted(true); onAccept(); }}
          disabled={accepted}
          className={`shrink-0 rounded-md px-3 py-1.5 font-mono text-[9px] tracking-wider border transition-all flex items-center gap-1 ${
            accepted
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-purple-500/40 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/60'
          }`}
        >
          {accepted ? <><Check className="h-3 w-3" /> EXTRACTED</> : <><Plus className="h-3 w-3" /> EXTRACT</>}
        </button>
      </div>
      <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">{shadow.description}</p>
      <p className="font-mono text-[10px] text-purple-400/70 leading-relaxed italic">↳ {shadow.reasoning}</p>
    </div>
  );
}

function DungeonGateCard({ dungeon, onAccept }: { dungeon: SuggestedDungeon; onAccept: () => void }) {
  const [accepted, setAccepted] = useState(false);
  const colorClass = DIFFICULTY_COLORS[dungeon.difficulty] || DIFFICULTY_COLORS['A-Rank'];

  return (
    <div className={`rounded-lg border p-4 space-y-2 transition-all ${
      accepted ? 'border-primary/20 bg-primary/5 opacity-60' : 'border-red-500/30 bg-red-500/5 hover:border-red-500/50'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-block rounded px-1.5 py-0.5 font-mono text-[9px] tracking-wider border ${colorClass}`}>
              {dungeon.difficulty}
            </span>
            <span className="font-mono text-[9px] text-muted-foreground">
              {DUNGEON_TYPE_LABELS[dungeon.type] || dungeon.type} · {dungeon.timeEstimate}
            </span>
          </div>
          <p className={`font-tech text-sm ${accepted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {dungeon.title}
          </p>
        </div>
        <button
          onClick={() => { setAccepted(true); onAccept(); }}
          disabled={accepted}
          className={`shrink-0 rounded-md px-3 py-1.5 font-mono text-[9px] tracking-wider border transition-all flex items-center gap-1 ${
            accepted
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/60'
          }`}
        >
          {accepted ? <><Check className="h-3 w-3" /> ENTERED</> : <><Swords className="h-3 w-3" /> ENTER</>}
        </button>
      </div>
      <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">{dungeon.description}</p>
      <div className="space-y-1">
        {dungeon.objectives.map((obj, i) => (
          <p key={i} className="font-mono text-[10px] text-foreground/60">• {obj}</p>
        ))}
      </div>
      <p className="font-mono text-[10px] text-red-400/70 leading-relaxed italic">↳ {dungeon.reasoning}</p>
      <p className="font-mono text-[10px] text-primary">+{dungeon.xpReward} XP</p>
    </div>
  );
}

interface SystemIntelligencePanelProps {
  intelligence: SystemIntelligence;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
  onCompleteChallenge: (id: string) => void;
  onAcceptShadow?: (shadow: SuggestedShadow) => void;
  onAcceptDungeon?: (dungeon: SuggestedDungeon) => void;
}

export function SystemIntelligencePanel({
  intelligence,
  loading,
  error,
  onGenerate,
  onCompleteChallenge,
  onAcceptShadow,
  onAcceptDungeon,
}: SystemIntelligencePanelProps) {
  const [trajectoryOpen, setTrajectoryOpen] = useState(false);
  const [challengesOpen, setChallengesOpen] = useState(true);
  const [shadowsOpen, setShadowsOpen] = useState(true);
  const [dungeonsOpen, setDungeonsOpen] = useState(true);

  const hasShadows = intelligence.suggestedShadows && intelligence.suggestedShadows.length > 0;
  const hasDungeons = intelligence.suggestedDungeons && intelligence.suggestedDungeons.length > 0;

  return (
    <div className="space-y-4">
      {/* Strategic Analysis */}
      <div
        className="rounded-lg border border-primary/20 bg-card/80 p-5 space-y-3"
        style={{ boxShadow: '0 0 25px hsl(187 100% 50% / 0.08)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="font-display text-[10px] uppercase tracking-[0.3em] text-primary/60">
              System Intelligence
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-muted-foreground/50">
              {intelligence.systemConfidence}% confidence
            </span>
            <button
              onClick={onGenerate}
              disabled={loading}
              className="text-muted-foreground/50 hover:text-primary transition-colors"
              title="Regenerate analysis"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <p className="font-mono text-xs text-foreground/80 leading-relaxed">
          {intelligence.strategicAnalysis}
        </p>

        {/* Pattern Alert */}
        {intelligence.patternAlert && (
          <div className="flex items-start gap-2 rounded-md border border-amber-400/20 bg-amber-400/5 p-3">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="font-mono text-[10px] text-amber-400/80 leading-relaxed">
              {intelligence.patternAlert}
            </p>
          </div>
        )}

        {error && (
          <p className="font-mono text-[10px] text-destructive">{error}</p>
        )}
      </div>

      {/* Shadow Recruits */}
      {hasShadows && (
        <Collapsible open={shadowsOpen} onOpenChange={setShadowsOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between rounded-lg border border-purple-500/20 bg-purple-500/5 px-4 py-3 group hover:border-purple-500/40 transition-all">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-purple-400" />
                <span className="font-mono text-[10px] tracking-wider text-purple-400">
                  SHADOW RECRUITS DETECTED
                </span>
                <span className="font-mono text-[9px] text-purple-400/50">
                  ({intelligence.suggestedShadows!.length})
                </span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-purple-400/60 transition-transform ${shadowsOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-3">
              {intelligence.suggestedShadows!.map((shadow, i) => (
                <ShadowRecruitCard
                  key={`shadow-${i}`}
                  shadow={shadow}
                  onAccept={() => onAcceptShadow?.(shadow)}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Dungeon Gates */}
      {hasDungeons && (
        <Collapsible open={dungeonsOpen} onOpenChange={setDungeonsOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 group hover:border-red-500/40 transition-all">
              <div className="flex items-center gap-2">
                <Swords className="h-3.5 w-3.5 text-red-400" />
                <span className="font-mono text-[10px] tracking-wider text-red-400">
                  DUNGEON GATES DETECTED
                </span>
                <span className="font-mono text-[9px] text-red-400/50">
                  ({intelligence.suggestedDungeons!.length})
                </span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-red-400/60 transition-transform ${dungeonsOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-3">
              {intelligence.suggestedDungeons!.map((dungeon, i) => (
                <DungeonGateCard
                  key={`dungeon-${i}`}
                  dungeon={dungeon}
                  onAccept={() => onAcceptDungeon?.(dungeon)}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Trajectory Forecast */}
      <Collapsible open={trajectoryOpen} onOpenChange={setTrajectoryOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between rounded-lg border border-border bg-card/60 px-4 py-3 group hover:border-primary/30 transition-all">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-primary/60" />
              <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
                TRAJECTORY FORECAST
              </span>
            </div>
            <ChevronDown
              className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${trajectoryOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2">
            <TrajectoryForecaster intelligence={intelligence} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Dynamic Challenges */}
      <Collapsible open={challengesOpen} onOpenChange={setChallengesOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between rounded-lg border border-border bg-card/60 px-4 py-3 group hover:border-primary/30 transition-all">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-primary/60" />
              <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
                DYNAMIC CHALLENGES
              </span>
            </div>
            <ChevronDown
              className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${challengesOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-3">
            {intelligence.dynamicChallenges.map(challenge => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onComplete={onCompleteChallenge}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/** Loading skeleton while intelligence is generating */
export function SystemIntelligenceLoading() {
  return (
    <div
      className="rounded-lg border border-primary/20 bg-card/80 p-5 space-y-3"
      style={{ boxShadow: '0 0 25px hsl(187 100% 50% / 0.08)' }}
    >
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-primary animate-pulse" />
        <span className="font-display text-[10px] uppercase tracking-[0.3em] text-primary/60">
          System Intelligence Initializing...
        </span>
      </div>
      <div className="space-y-2">
        <div className="h-3 rounded bg-muted/30 animate-pulse w-full" />
        <div className="h-3 rounded bg-muted/30 animate-pulse w-4/5" />
        <div className="h-3 rounded bg-muted/30 animate-pulse w-3/5" />
      </div>
    </div>
  );
}
