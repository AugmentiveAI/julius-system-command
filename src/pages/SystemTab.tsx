import { useState } from 'react';
import { Users, Sword, Backpack, Store as StoreIcon, Brain, Settings, Info, ChevronRight, Dna, Pill, RotateCcw, Calendar, Trash2, LogOut, Zap, Bot, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ShadowArmyPanel } from '@/components/shadows/ShadowArmyPanel';
import { DungeonPanel } from '@/components/dungeons/DungeonPanel';
import { CounterCard } from '@/components/inventory/CounterCard';
import { ListCard } from '@/components/inventory/ListCard';
import { CurrencyCard } from '@/components/inventory/CurrencyCard';
import { CurrencyDisplay } from '@/components/dashboard/CurrencyDisplay';
import { StoreItemCard } from '@/components/store/StoreItemCard';
import { ItemDetailModal } from '@/components/store/ItemDetailModal';
import { ActiveBoostsBar } from '@/components/dashboard/ActiveBoostsBar';
import { SupplementChecklist } from '@/components/biometrics/SupplementChecklist';
import { JULIUS_GENETICS, GeneticTrait } from '@/types/genetics';
import { useInventory } from '@/hooks/useInventory';
import { useProtocolQuests } from '@/hooks/useProtocolQuests';
import { usePlayer } from '@/hooks/usePlayer';
import { useCurrency } from '@/hooks/useCurrency';
import { useStore } from '@/hooks/useStore';
import { useSkills } from '@/hooks/useSkills';
import { useShadowArmy } from '@/hooks/useShadowArmy';
import { useDungeons } from '@/hooks/useDungeons';
import { usePillarStreak } from '@/hooks/usePillarStreak';
import { useSystemNotifications } from '@/hooks/useSystemNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useAIQuests } from '@/hooks/useAIQuests';
import { Switch } from '@/components/ui/switch';
import { StoreItem, ItemCategory } from '@/types/store';
import { AwakeningSequence } from '@/components/onboarding/AwakeningSequence';

// TODO: Phase2-IP-rebrand — "Shadow Army", "Arise", "Hunter", rank names

type SystemSection = null | 'shadows' | 'dungeons' | 'inventory' | 'store' | 'skills' | 'genetics' | 'supplements' | 'settings';

const AI_SETTINGS_KEY = 'systemAISettings';

const MenuItem = ({ icon: Icon, label, onClick, badge }: { icon: React.ElementType; label: string; onClick: () => void; badge?: string }) => (
  <button onClick={onClick} className="w-full text-left">
    <div className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-3.5 transition-colors hover:border-primary/30">
      <div className="flex items-center gap-3">
        <Icon className="h-4.5 w-4.5 text-muted-foreground" />
        <span className="font-mono text-xs text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge && <span className="font-mono text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{badge}</span>}
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  </button>
);

const SystemTab = () => {
  const [activeSection, setActiveSection] = useState<SystemSection>(null);
  const { player } = usePlayer();
  const { shadows, addShadow } = useShadowArmy();
  const { completedDungeons } = useDungeons();
  const { addNotification } = useSystemNotifications();
  const pillarStreak = usePillarStreak();
  const { signOut } = useAuth();

  const skillCtx = { player, shadowCount: shadows.length, dungeonClears: completedDungeons.length, pillarStreak: pillarStreak.streak };
  const { unlockedSkills, newlyUnlocked, dismissNewSkill } = useSkills(skillCtx);

  const { inventory, setAutomationsDeployed, setCashReserves, addClient, removeClient, addSkill, removeSkill, addTemplate, removeTemplate } = useInventory();
  const { quests, toggleQuest } = useProtocolQuests();
  const { essence, monarchFragments } = useCurrency();
  const { storeItems, purchaseItem, useItem, canAffordItem, getOwnedQuantity, inventory: storeInventory } = useStore();
  const { isGenerating, generate } = useAIQuests();

  const [detailItem, setDetailItem] = useState<StoreItem | null>(null);
  const [showReplay, setShowReplay] = useState(false);
  const [settings, setSettings] = useState(() => { try { return JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) || '{}'); } catch { return {}; } });

  const supplementQuestStates = quests.reduce<Record<string, boolean>>((acc, q) => {
    if (q.id.includes('supplements')) acc[q.id] = q.completed;
    return acc;
  }, {});

  const backButton = (
    <button onClick={() => setActiveSection(null)} className="font-mono text-[10px] text-primary mb-3 tracking-wider">← BACK</button>
  );

  // Skill unlock banner
  const newSkillBanner = newlyUnlocked ? (
    <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 mb-3">
      <p className="font-mono text-[10px] tracking-wider text-primary">NEW SKILL UNLOCKED: {newlyUnlocked.icon} {newlyUnlocked.name}</p>
      <p className="font-mono text-[9px] text-muted-foreground mt-1">{newlyUnlocked.effect}</p>
      <button onClick={dismissNewSkill} className="font-mono text-[9px] text-primary/60 mt-2 hover:text-primary">Dismiss</button>
    </div>
  ) : null;

  if (showReplay) {
    return <AwakeningSequence onComplete={() => { setShowReplay(false); window.location.reload(); }} isReplay />;
  }

  // Sub-section rendering
  if (activeSection === 'shadows') {
    return (
      <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
        <div className="mx-auto max-w-md px-4">
          {backButton}
          <ShadowArmyPanel onShadowAdded={(name) => addNotification('shadow_extracted', 'Shadow Extracted', `"${name}" joined.`, { shadowName: name })} />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (activeSection === 'dungeons') {
    return (
      <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
        <div className="mx-auto max-w-md px-4">
          {backButton}
          <DungeonPanel onXPGained={(xp) => addNotification('dungeon_cleared', 'Dungeon Cleared', `${xp} XP claimed.`, { xp })} />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (activeSection === 'inventory') {
    return (
      <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
        <div className="mx-auto max-w-md space-y-4 px-4">
          {backButton}
          <h2 className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground text-center">INVENTORY</h2>
          <div className="grid gap-4 grid-cols-2">
            <CounterCard title="Automations" icon={<Bot className="h-5 w-5 text-primary" />} value={inventory.automationsDeployed} onChange={setAutomationsDeployed} />
            <CurrencyCard title="Cash Reserves" value={inventory.cashReserves} onChange={setCashReserves} />
          </div>
          <ListCard title="Active Clients" icon={<Users className="h-5 w-5 text-secondary" />} items={inventory.activeClients} onAdd={addClient} onRemove={removeClient} placeholder="Add client..." />
          <ListCard title="Skills" icon={<Brain className="h-5 w-5 text-primary" />} items={inventory.skillsCreated} onAdd={addSkill} onRemove={removeSkill} placeholder="Add skill..." />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (activeSection === 'store') {
    return (
      <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
        <div className="mx-auto max-w-md px-4 space-y-4">
          {backButton}
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">STORE</h2>
            <CurrencyDisplay />
          </div>
          <ActiveBoostsBar />
          <div className="grid gap-3 grid-cols-2">
            {storeItems.map(item => (
              <StoreItemCard key={item.id} item={item} onTap={() => setDetailItem(item)} owned={getOwnedQuantity(item.id)} canAfford={canAffordItem(item)} onPurchase={() => purchaseItem(item.id)} />
            ))}
          </div>
          <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} onPurchase={() => detailItem && purchaseItem(detailItem.id)} onUse={() => detailItem && useItem(detailItem.id)} canAfford={detailItem ? canAffordItem(detailItem) : false} owned={detailItem ? getOwnedQuantity(detailItem.id) : 0} open={!!detailItem} />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (activeSection === 'skills') {
    return (
      <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
        <div className="mx-auto max-w-md px-4 space-y-3">
          {backButton}
          <h2 className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground text-center">SKILLS</h2>
          {unlockedSkills.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground text-center py-8">No skills unlocked yet. Keep leveling.</p>
          ) : (
            unlockedSkills.map(skill => (
              <div key={skill.id} className="rounded-lg border border-border bg-card/50 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{skill.icon}</span>
                  <div>
                    <h3 className="font-mono text-xs font-bold text-foreground">{skill.name}</h3>
                    <p className="font-mono text-[9px] text-muted-foreground">{skill.effect}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  if (activeSection === 'genetics') {
    const buffs = JULIUS_GENETICS.traits.filter(t => t.type === 'buff');
    const debuffs = JULIUS_GENETICS.traits.filter(t => t.type === 'debuff');
    return (
      <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
        <div className="mx-auto max-w-md px-4">
          {backButton}
          <h2 className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground text-center mb-4">GENETIC PROFILE</h2>
          <div className="rounded-lg border border-border bg-card/50 p-4 text-center mb-4">
            <p className="font-mono text-[9px] text-muted-foreground uppercase">Archetype</p>
            <h3 className="font-display text-lg font-bold text-primary mt-1">{JULIUS_GENETICS.archetype}</h3>
          </div>
          <p className="font-mono text-[9px] text-green-400 mb-2">ACTIVE BUFFS</p>
          <div className="space-y-2 mb-4">
            {buffs.map(t => (
              <div key={t.id} className="rounded-lg border border-green-900/50 bg-green-950/30 p-3">
                <div className="flex items-start gap-2">
                  <span>{t.icon}</span>
                  <div>
                    <h4 className="font-mono text-xs font-bold text-foreground">{t.name} <span className="text-muted-foreground font-normal">({t.gene})</span></h4>
                    <p className="font-mono text-[9px] text-muted-foreground mt-0.5">{t.effect}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="font-mono text-[9px] text-red-400 mb-2">ACTIVE DEBUFFS</p>
          <div className="space-y-2">
            {debuffs.map(t => (
              <div key={t.id} className="rounded-lg border border-red-900/50 bg-red-950/30 p-3">
                <div className="flex items-start gap-2">
                  <span>{t.icon}</span>
                  <div>
                    <h4 className="font-mono text-xs font-bold text-foreground">{t.name} <span className="text-muted-foreground font-normal">({t.gene})</span></h4>
                    <p className="font-mono text-[9px] text-muted-foreground mt-0.5">{t.optimization}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (activeSection === 'supplements') {
    return (
      <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
        <div className="mx-auto max-w-md px-4">
          {backButton}
          <h2 className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground text-center mb-4">SUPPLEMENTS</h2>
          <SupplementChecklist questStates={supplementQuestStates} onToggle={toggleQuest} />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (activeSection === 'settings') {
    const updateField = (key: string, val: any) => {
      const next = { ...settings, [key]: val };
      setSettings(next);
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(next));
    };

    return (
      <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
        <div className="mx-auto max-w-md px-4 space-y-4">
          {backButton}
          <h2 className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground text-center">SETTINGS</h2>

          <div className="rounded-lg border border-border bg-card/50 p-4 space-y-4">
            {/* AI Settings */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /><span className="font-mono text-xs">AI Quest Generation</span></div>
              <Switch checked={settings.aiEnabled || false} onCheckedChange={(v) => updateField('aiEnabled', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /><span className="font-mono text-xs">Auto-Deploy</span></div>
              <Switch checked={settings.autoDeploy || false} onCheckedChange={(v) => updateField('autoDeploy', v)} />
            </div>

            <div className="h-px bg-border" />

            <button onClick={() => setShowReplay(true)} className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 font-mono text-xs text-muted-foreground hover:border-primary/40 hover:text-primary">
              <RotateCcw className="h-4 w-4" />Replay Awakening
            </button>

            <button
              onClick={() => { if (confirm('Reset ALL data?')) { localStorage.clear(); window.location.reload(); } }}
              className="flex w-full items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 font-mono text-xs text-destructive/70 hover:border-destructive/50 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />Clear All Data
            </button>

            <button onClick={() => signOut()} className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 font-mono text-xs text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />Sign Out
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Main menu
  return (
    <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
      <div className="mx-auto max-w-md space-y-2 px-4">
        <h1 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground text-center mb-4">SYSTEM</h1>

        {newSkillBanner}

        <MenuItem icon={Users} label="Shadow Army" onClick={() => setActiveSection('shadows')} badge={`${shadows.length}`} />
        <MenuItem icon={Sword} label="Dungeons" onClick={() => setActiveSection('dungeons')} />
        <MenuItem icon={Backpack} label="Inventory" onClick={() => setActiveSection('inventory')} />
        <MenuItem icon={StoreIcon} label="Store" onClick={() => setActiveSection('store')} />
        <MenuItem icon={Brain} label="Skills" onClick={() => setActiveSection('skills')} badge={`${unlockedSkills.length}`} />
        <MenuItem icon={Dna} label="Genetic Profile" onClick={() => setActiveSection('genetics')} />
        <MenuItem icon={Pill} label="Supplements" onClick={() => setActiveSection('supplements')} />
        <MenuItem icon={Settings} label="Settings" onClick={() => setActiveSection('settings')} />
      </div>
      <BottomNav />
    </div>
  );
};

export default SystemTab;
