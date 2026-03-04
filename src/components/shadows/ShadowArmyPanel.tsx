import { useState } from 'react';
import { Plus, Swords, TrendingUp, ChevronDown, ChevronUp, Trash2, ArrowUp } from 'lucide-react';
import { Shadow, SHADOW_CATEGORIES, ShadowCategory, getCategoryIcon, getTotalArmyPower, getForceMultiplier } from '@/types/shadowArmy';
import { useShadowArmy } from '@/hooks/useShadowArmy';

const STATUS_COLORS: Record<string, string> = {
  active: 'text-primary border-primary/30',
  dormant: 'text-muted-foreground border-border',
  evolving: 'text-secondary border-secondary/30',
};

function ShadowCard({ shadow, onLevelUp, onRemove }: {
  shadow: Shadow;
  onLevelUp: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={`rounded-lg border bg-card p-3 transition-all ${STATUS_COLORS[shadow.status]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{getCategoryIcon(shadow.category)}</span>
          <div className="min-w-0">
            <h4 className="font-tech text-sm text-foreground truncate">{shadow.name}</h4>
            {shadow.description && (
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{shadow.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-mono text-[10px] text-primary">LV {shadow.power_level}</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase text-muted-foreground">{shadow.category}</span>
          {shadow.contribution_score > 0 && (
            <span className="font-mono text-[9px] text-secondary">+{shadow.contribution_score}%</span>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={onLevelUp} className="p-1 rounded hover:bg-primary/10 transition-colors" title="Level Up">
            <ArrowUp className="h-3 w-3 text-primary" />
          </button>
          <button onClick={onRemove} className="p-1 rounded hover:bg-destructive/10 transition-colors" title="Remove">
            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddShadowForm({ onAdd, onCancel }: {
  onAdd: (name: string, category: ShadowCategory, description?: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ShadowCategory>('automation');
  const [description, setDescription] = useState('');

  return (
    <div className="rounded-lg border border-primary/30 bg-card p-4 space-y-3">
      <p className="font-mono text-[10px] tracking-widest text-primary uppercase">Extract New Shadow</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Shadow name..."
        className="w-full rounded-md border border-border bg-background/50 px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none"
        autoFocus
      />
      <div className="grid grid-cols-3 gap-1.5">
        {SHADOW_CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`rounded-md border px-2 py-1.5 font-mono text-[10px] transition-all ${
              category === cat.value
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/20'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)..."
        className="w-full rounded-md border border-border bg-background/50 px-3 py-2 font-mono text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          onClick={() => { if (name.trim()) onAdd(name.trim(), category, description.trim() || undefined); }}
          disabled={!name.trim()}
          className={`flex-1 py-2 rounded-md font-mono text-[10px] tracking-wider transition-all ${
            name.trim() ? 'border border-primary/50 bg-primary/10 text-primary' : 'border border-border text-muted-foreground/40'
          }`}
        >
          EXTRACT
        </button>
        <button onClick={onCancel} className="py-2 px-3 rounded-md font-mono text-[10px] text-muted-foreground/50 hover:text-muted-foreground">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function ShadowArmyPanel() {
  const { shadows, loading, addShadow, removeShadow, levelUp } = useShadowArmy();
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);

  const totalPower = getTotalArmyPower(shadows);
  const multiplier = getForceMultiplier(shadows);
  const activeShadows = shadows.filter(s => s.status === 'active');

  const handleAdd = async (name: string, category: ShadowCategory, description?: string) => {
    await addShadow(name, category, description);
    setAdding(false);
  };

  const handleRemove = async (id: string) => {
    if (confirm('Dissolve this shadow?')) await removeShadow(id);
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-card/80 px-4 py-3 transition-colors hover:border-secondary/30"
      >
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-secondary" />
          <span className="font-tech text-xs text-secondary uppercase tracking-wider">Shadow Army</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {activeShadows.length} shadows
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-primary" />
            <span className="font-mono text-[10px] text-primary">{multiplier.toFixed(1)}x</span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">PWR {totalPower}</span>
          {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="space-y-2 pl-1">
          {loading ? (
            <div className="rounded-lg border border-border bg-card/50 p-4 text-center">
              <span className="font-mono text-[10px] text-muted-foreground animate-pulse">Summoning shadows...</span>
            </div>
          ) : (
            <>
              {/* Stats bar */}
              <div className="flex gap-2">
                {(['automation', 'client', 'content', 'sop', 'skill', 'tool'] as ShadowCategory[]).map(cat => {
                  const count = shadows.filter(s => s.category === cat && s.status === 'active').length;
                  if (count === 0) return null;
                  return (
                    <span key={cat} className="font-mono text-[9px] text-muted-foreground">
                      {getCategoryIcon(cat)}{count}
                    </span>
                  );
                })}
              </div>

              {/* Shadow list */}
              {shadows.map(shadow => (
                <ShadowCard
                  key={shadow.id}
                  shadow={shadow}
                  onLevelUp={() => levelUp(shadow.id)}
                  onRemove={() => handleRemove(shadow.id)}
                />
              ))}

              {/* Add shadow */}
              {adding ? (
                <AddShadowForm onAdd={handleAdd} onCancel={() => setAdding(false)} />
              ) : (
                <button
                  onClick={() => setAdding(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-secondary/30 py-3 font-mono text-[10px] text-secondary/60 transition-all hover:border-secondary/50 hover:text-secondary"
                >
                  <Plus className="h-3 w-3" />
                  Extract New Shadow
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
