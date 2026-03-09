import { useState, useEffect } from 'react';
import { Skull, Timer, Crown, ChevronDown, ChevronUp, Plus, Swords, Lock, CheckCircle2, XCircle, Play, Zap, Key } from 'lucide-react';
import { Dungeon, DungeonTemplate, DungeonObjective, DungeonType, GeneticModifier } from '@/types/dungeon';
import { useDungeons } from '@/hooks/useDungeons';
import { useStore } from '@/hooks/useStore';
import { KeyRequiredModal } from '@/components/dungeons/KeyRequiredModal';

const TYPE_CONFIG: Record<DungeonType, { icon: typeof Skull; label: string; color: string; borderColor: string }> = {
  boss_fight: { icon: Skull, label: 'BOSS FIGHT', color: 'text-red-400', borderColor: 'border-red-400/30' },
  instant_dungeon: { icon: Timer, label: 'INSTANT DUNGEON', color: 'text-amber-400', borderColor: 'border-amber-400/30' },
  s_rank_gate: { icon: Crown, label: 'S-RANK GATE', color: 'text-secondary', borderColor: 'border-secondary/30' },
  penalty: { icon: Skull, label: 'PENALTY QUEST', color: 'text-destructive', borderColor: 'border-destructive/30' },
};

const DIFFICULTY_BADGE: Record<string, string> = {
  'B-Rank': 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  'A-Rank': 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  'S-Rank': 'text-red-400 border-red-400/30 bg-red-400/10',
  'SS-Rank': 'text-secondary border-secondary/30 bg-secondary/10',
};

function TimeRemaining({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining('EXPIRED'); return; }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      if (hrs > 24) setRemaining(`${Math.floor(hrs / 24)}d ${hrs % 24}h`);
      else if (hrs > 0) setRemaining(`${hrs}h ${mins}m`);
      else setRemaining(`${mins}m`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span className="font-mono text-[9px] text-muted-foreground">
      ⏱ {remaining}
    </span>
  );
}

function GeneticBadge({ mod }: { mod: GeneticModifier }) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-1">
      <Zap className="h-2.5 w-2.5 text-primary" />
      <span className="font-mono text-[8px] text-primary/80">{mod.gene}: {mod.effect}</span>
    </div>
  );
}

function DungeonCard({
  dungeon,
  onEnter,
  onCompleteObjective,
  onAbandon,
  onClaimXP,
  keyRequired,
  hasKey,
}: {
  dungeon: Dungeon;
  onEnter: () => void;
  onCompleteObjective: (objectiveId: string) => void;
  onAbandon: () => void;
  onClaimXP: () => void;
  keyRequired?: string | null;
  hasKey?: boolean;
}) {
  const [detailOpen, setDetailOpen] = useState(dungeon.status === 'active');
  const config = TYPE_CONFIG[dungeon.dungeon_type];
  const Icon = config.icon;
  const objectives = dungeon.objectives as DungeonObjective[];
  const completedCount = objectives.filter(o => o.completed).length;
  const geneticMods = dungeon.genetic_modifiers as GeneticModifier[];
  const isCompleted = dungeon.status === 'completed';
  const isFailed = dungeon.status === 'failed';

  return (
    <div className={`rounded-lg border transition-all ${
      isCompleted ? 'border-primary/30 bg-primary/5 opacity-70'
      : isFailed ? 'border-destructive/20 bg-destructive/5 opacity-50'
      : `${config.borderColor} bg-card/80`
    }`}>
      <button
        onClick={() => setDetailOpen(!detailOpen)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-mono text-[8px] tracking-wider ${config.color}`}>{config.label}</span>
              <span className={`inline-block rounded px-1 py-0.5 font-mono text-[8px] border ${DIFFICULTY_BADGE[dungeon.difficulty]}`}>
                {dungeon.difficulty}
              </span>
            </div>
            <p className={`font-tech text-sm truncate ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {dungeon.title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dungeon.expires_at && dungeon.status === 'active' && (
            <TimeRemaining expiresAt={dungeon.expires_at} />
          )}
          <span className="font-mono text-[9px] text-muted-foreground">
            {completedCount}/{objectives.length}
          </span>
          {detailOpen ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </div>
      </button>

      {detailOpen && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/30 pt-3">
          {dungeon.description && (
            <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
              {dungeon.description}
            </p>
          )}

          {/* Genetic Modifiers */}
          {geneticMods.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {geneticMods.map((mod, i) => <GeneticBadge key={i} mod={mod} />)}
            </div>
          )}

          {/* Objectives */}
          <div className="space-y-1.5">
            {objectives.map(obj => (
              <button
                key={obj.id}
                onClick={() => { if (!obj.completed && dungeon.status === 'active') onCompleteObjective(obj.id); }}
                disabled={obj.completed || dungeon.status !== 'active'}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-all ${
                  obj.completed
                    ? 'bg-primary/5'
                    : dungeon.status === 'active'
                    ? 'bg-muted/20 hover:bg-muted/40'
                    : 'bg-muted/10 opacity-50'
                }`}
              >
                {obj.completed
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  : <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                }
                <span className={`font-mono text-[10px] ${obj.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {obj.title}
                </span>
              </button>
            ))}
          </div>

          {/* XP Reward */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-primary">+{dungeon.xp_reward} XP</span>

            {/* Actions */}
            <div className="flex gap-2">
              {dungeon.status === 'available' && (
                <button
                  onClick={onEnter}
                  disabled={keyRequired && !hasKey}
                  className={`flex items-center gap-1 rounded-md border px-3 py-1.5 font-mono text-[10px] transition-all ${
                    keyRequired && !hasKey
                      ? 'border-muted text-muted-foreground cursor-not-allowed'
                      : 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
                  }`}
                >
                  {keyRequired && !hasKey ? (
                    <><Key className="h-3 w-3" /> KEY REQUIRED</>
                  ) : (
                    <><Play className="h-3 w-3" /> ENTER</>
                  )}
                </button>
              )}
              {isCompleted && (
                <button
                  onClick={onClaimXP}
                  className="flex items-center gap-1 rounded-md border border-primary/50 bg-primary/20 px-3 py-1.5 font-mono text-[10px] text-primary font-bold animate-pulse"
                >
                  CLAIM XP
                </button>
              )}
              {dungeon.status === 'active' && (
                <button
                  onClick={onAbandon}
                  className="flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 font-mono text-[9px] text-destructive/60 hover:text-destructive transition-all"
                >
                  <XCircle className="h-3 w-3" />
                  Abandon
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface DungeonPanelProps {
  onXPGained: (xp: number) => void;
}

export function DungeonPanel({ onXPGained }: DungeonPanelProps) {
  const { activeDungeons, completedDungeons, loading, getAvailableTemplates, createDungeon, enterDungeon, completeObjective, abandonDungeon } = useDungeons();
  const { hasKey, useKey } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<DungeonTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [keyModal, setKeyModal] = useState<{ open: boolean; title: string; keyName: string; owned: number }>({ open: false, title: '', keyName: '', owned: 0 });

  const handleShowTemplates = async () => {
    if (showTemplates) { setShowTemplates(false); return; }
    setLoadingTemplates(true);
    const available = await getAvailableTemplates();
    setTemplates(available);
    setShowTemplates(true);
    setLoadingTemplates(false);
  };

  const handleCreateDungeon = async (template: DungeonTemplate) => {
    await createDungeon(template);
    setShowTemplates(false);
  };

  const getKeyType = (dungeonType: string): 'boss_key' | 's_rank_key' | null => {
    if (dungeonType === 'boss_fight') return 'boss_key';
    if (dungeonType === 's_rank_gate') return 's_rank_key';
    return null;
  };

  const getKeyName = (keyType: string): string => {
    if (keyType === 'boss_key') return 'Boss Gate Key';
    if (keyType === 's_rank_key') return 'S-Rank Gate Key';
    return 'Key';
  };

  const handleEnterDungeon = (dungeon: Dungeon) => {
    const keyType = getKeyType(dungeon.dungeon_type);
    if (keyType) {
      if (!hasKey(keyType)) {
        setKeyModal({ open: true, title: dungeon.title, keyName: getKeyName(keyType), owned: 0 });
        return;
      }
      useKey(keyType);
    }
    enterDungeon(dungeon.id);
  };

  const handleCompleteObjective = async (dungeonId: string, objectiveId: string) => {
    const result = await completeObjective(dungeonId, objectiveId);
    if (result?.completed) {
      // Don't auto-claim — let user click CLAIM XP
    }
  };

  const handleClaimXP = (dungeon: Dungeon) => {
    if (claimedIds.has(dungeon.id)) return;
    setClaimedIds(prev => new Set([...prev, dungeon.id]));
    onXPGained(dungeon.xp_reward);
  };

  const totalActive = activeDungeons.length;
  const totalCleared = completedDungeons.length;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-card/80 px-4 py-3 transition-colors hover:border-red-400/30"
      >
        <div className="flex items-center gap-2">
          <Skull className="h-4 w-4 text-red-400" />
          <span className="font-tech text-xs text-red-400 uppercase tracking-wider">Dungeons</span>
          {totalActive > 0 && (
            <span className="font-mono text-[10px] text-amber-400">{totalActive} active</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {totalCleared > 0 && (
            <span className="font-mono text-[10px] text-muted-foreground">{totalCleared} cleared</span>
          )}
          {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="space-y-2 pl-1">
          {loading ? (
            <div className="rounded-lg border border-border bg-card/50 p-4 text-center">
              <span className="font-mono text-[10px] text-muted-foreground animate-pulse">Scanning for dungeons...</span>
            </div>
          ) : (
            <>
              {/* Active Dungeons */}
              {activeDungeons.map(d => {
                const keyType = getKeyType(d.dungeon_type);
                return (
                <DungeonCard
                  key={d.id}
                  dungeon={d}
                  onEnter={() => handleEnterDungeon(d)}
                  onCompleteObjective={(objId) => handleCompleteObjective(d.id, objId)}
                  onAbandon={() => { if (confirm('Abandon this dungeon? You will lose all progress.')) abandonDungeon(d.id); }}
                  onClaimXP={() => handleClaimXP(d)}
                  keyRequired={keyType}
                  hasKey={keyType ? hasKey(keyType) : true}
                />
                );
              })}

              {/* Recently completed */}
              {completedDungeons.slice(0, 2).map(d => (
                <DungeonCard
                  key={d.id}
                  dungeon={d}
                  onEnter={() => {}}
                  onCompleteObjective={() => {}}
                  onAbandon={() => {}}
                  onClaimXP={() => handleClaimXP(d)}
                />
              ))}

              {/* Discover dungeons */}
              <button
                onClick={handleShowTemplates}
                disabled={loadingTemplates}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-red-400/30 py-3 font-mono text-[10px] text-red-400/60 transition-all hover:border-red-400/50 hover:text-red-400"
              >
                {loadingTemplates ? (
                  <span className="animate-pulse">Scanning gates...</span>
                ) : showTemplates ? (
                  <>Close Gate Scanner</>
                ) : (
                  <><Plus className="h-3 w-3" /> Discover Dungeons</>
                )}
              </button>

              {/* Template Selection */}
              {showTemplates && (
                <div className="space-y-2">
                  {templates.length === 0 ? (
                    <div className="rounded-lg border border-border bg-card/50 p-4 text-center space-y-1">
                      <Lock className="h-4 w-4 text-muted-foreground mx-auto" />
                      <p className="font-mono text-[10px] text-muted-foreground">
                        No new gates available. Level up, build your streak, or grow your Shadow Army to unlock more.
                      </p>
                    </div>
                  ) : (
                    templates.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => handleCreateDungeon(t)}
                        className={`w-full rounded-lg border p-3 text-left transition-all hover:bg-card/80 ${
                          TYPE_CONFIG[t.type].borderColor
                        } bg-card/40`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-mono text-[8px] tracking-wider ${TYPE_CONFIG[t.type].color}`}>
                            {TYPE_CONFIG[t.type].label}
                          </span>
                          <span className={`inline-block rounded px-1 py-0.5 font-mono text-[8px] border ${DIFFICULTY_BADGE[t.difficulty]}`}>
                            {t.difficulty}
                          </span>
                          <span className="font-mono text-[9px] text-primary">+{Math.round(t.baseXP * t.geneticModifiers.reduce((m, g) => m * g.multiplier, 1))} XP</span>
                        </div>
                        <p className="font-tech text-sm text-foreground">{t.title}</p>
                        <p className="font-mono text-[9px] text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                        {t.geneticModifiers.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <Zap className="h-2.5 w-2.5 text-primary" />
                            <span className="font-mono text-[8px] text-primary/60">
                              {t.geneticModifiers.map(g => g.gene).join(' + ')} calibrated
                            </span>
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
