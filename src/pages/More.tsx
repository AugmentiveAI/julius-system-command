import { useState } from 'react';
import { Dna, Backpack, Pill, BarChart3, Settings, Info, ChevronRight, RotateCcw, Calendar, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BottomNav } from '@/components/navigation/BottomNav';
import { JULIUS_GENETICS, GeneticTrait } from '@/types/genetics';
import { SupplementChecklist } from '@/components/biometrics/SupplementChecklist';
import { CounterCard } from '@/components/inventory/CounterCard';
import { ListCard } from '@/components/inventory/ListCard';
import { CurrencyCard } from '@/components/inventory/CurrencyCard';
import { useInventory } from '@/hooks/useInventory';
import { useProtocolQuests } from '@/hooks/useProtocolQuests';
import { AwakeningSequence } from '@/components/onboarding/AwakeningSequence';
import { Bot, Users, Brain, FileCode } from 'lucide-react';

type MoreSection = null | 'genetics' | 'inventory' | 'supplements' | 'settings' | 'about';

const TraitCard = ({ trait, isBuff }: { trait: GeneticTrait; isBuff: boolean }) => {
  const bgClass = isBuff ? 'bg-green-950/30 border-green-900/50' : 'bg-red-950/30 border-red-900/50';
  return (
    <div className={`rounded-lg border p-3 ${bgClass}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{trait.icon}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-tech text-sm font-semibold text-foreground">{trait.name}</h3>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{trait.gene}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{isBuff ? trait.effect : trait.optimization}</p>
        </div>
      </div>
    </div>
  );
};

const MenuItem = ({
  icon: Icon,
  label,
  onClick,
  isLink,
  to,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  isLink?: boolean;
  to?: string;
}) => {
  const content = (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="font-tech text-sm text-foreground">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );

  if (isLink && to) {
    return <Link to={to}>{content}</Link>;
  }
  return <button onClick={onClick} className="w-full text-left">{content}</button>;
};

const More = () => {
  const [activeSection, setActiveSection] = useState<MoreSection>(null);
  const [showReplay, setShowReplay] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    return localStorage.getItem('systemStartDate') || new Date().toISOString().split('T')[0];
  });

  const { quests, toggleQuest } = useProtocolQuests();
  const {
    inventory, setAutomationsDeployed, setCashReserves,
    addClient, removeClient, addSkill, removeSkill, addTemplate, removeTemplate,
  } = useInventory();

  const supplementQuestStates = quests.reduce<Record<string, boolean>>((acc, q) => {
    if (q.id.includes('supplements')) acc[q.id] = q.completed;
    return acc;
  }, {});

  const handleReplayComplete = () => {
    // Soft reset: reset day/quests/XP/streaks but keep history, inventory, settings
    const keysToReset = [
      // Core daily state
      'the-system-protocol-quests',
      'the-system-quests',
      'the-system-daily-xp',
      'the-system-pillar-quests',
      'the-system-pillar-streaks',
      // Training & workout
      'the-system-workout',
      'systemMuscleRecovery',
      // State & scans
      'systemStateHistory',
      'systemLastScanDate',
      'systemDayCycle',
      'systemGeneticHUD',
      // Sprint & focus
      'systemSprintTimer',
      'systemFocusMode',
      'systemFocusModeActive',
      // Persuasion & calibration
      'systemPreCommitment',
      'systemPreCommitTriggerDate',
      'systemCalibratedCompletions',
      'systemCompletionHistory',
      'systemResistanceData',
      'systemPersuasionProfile',
      'systemPersuasionOutcomes',
      'systemPersuasionOptimizer',
      // Quests & comms
      'systemShadowQuest',
      'systemCommsState',
      'the-system-caffeine',
      // Weekly planning
      'systemWeeklyPlan',
      'systemWeeklyPlanDismissed',
      'systemResistancePrevScore',
    ];
    keysToReset.forEach(k => localStorage.removeItem(k));
    // Reset start date to today
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    localStorage.setItem('systemStartDate', today);
    setStartDate(today);
    setShowReplay(false);
    window.location.reload();
  };

  if (showReplay) {
    return <AwakeningSequence onComplete={handleReplayComplete} isReplay />;
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    localStorage.setItem('systemStartDate', e.target.value);
  };

  const handleClearData = () => {
    if (confirm('This will reset ALL System data. Are you sure?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // Sub-section views
  if (activeSection === 'genetics') {
    const buffs = JULIUS_GENETICS.traits.filter(t => t.type === 'buff');
    const debuffs = JULIUS_GENETICS.traits.filter(t => t.type === 'debuff');
    return (
      <div className="min-h-screen bg-background pb-24 pt-4">
        <div className="mx-auto max-w-md px-4">
          <button onClick={() => setActiveSection(null)} className="font-mono text-xs text-primary mb-4">
            ← Back
          </button>
          <h1 className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground text-center mb-4">
            Genetic Profile
          </h1>
          <div className="rounded-lg border border-border bg-card p-4 text-center mb-6">
            <p className="font-mono text-[10px] text-muted-foreground uppercase">Archetype</p>
            <h2 className="font-display text-xl font-bold text-primary text-glow-primary mt-1">
              {JULIUS_GENETICS.archetype}
            </h2>
          </div>
          <h3 className="font-mono text-xs text-green-400 mb-2">Active Buffs</h3>
          <div className="space-y-2 mb-6">
            {buffs.map(t => <TraitCard key={t.id} trait={t} isBuff />)}
          </div>
          <h3 className="font-mono text-xs text-red-400 mb-2">Active Debuffs</h3>
          <div className="space-y-2">
            {debuffs.map(t => <TraitCard key={t.id} trait={t} isBuff={false} />)}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (activeSection === 'inventory') {
    return (
      <div className="min-h-screen bg-background pb-24 pt-4">
        <div className="mx-auto max-w-md space-y-4 px-4">
          <button onClick={() => setActiveSection(null)} className="font-mono text-xs text-primary">
            ← Back
          </button>
          <h1 className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground text-center mb-2">
            Inventory
          </h1>
          <div className="grid gap-4 grid-cols-2">
            <CounterCard title="Automations" icon={<Bot className="h-5 w-5 text-primary" />} value={inventory.automationsDeployed} onChange={setAutomationsDeployed} />
            <CurrencyCard title="Cash Reserves" value={inventory.cashReserves} onChange={setCashReserves} />
          </div>
          <ListCard title="Active Clients" icon={<Users className="h-5 w-5 text-secondary" />} items={inventory.activeClients} onAdd={addClient} onRemove={removeClient} placeholder="Add client..." />
          <ListCard title="Skills" icon={<Brain className="h-5 w-5 text-primary" />} items={inventory.skillsCreated} onAdd={addSkill} onRemove={removeSkill} placeholder="Add skill..." />
          <ListCard title="Templates" icon={<FileCode className="h-5 w-5 text-secondary" />} items={inventory.templatesFrameworks} onAdd={addTemplate} onRemove={removeTemplate} placeholder="Add template..." />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (activeSection === 'supplements') {
    return (
      <div className="min-h-screen bg-background pb-24 pt-4">
        <div className="mx-auto max-w-md px-4">
          <button onClick={() => setActiveSection(null)} className="font-mono text-xs text-primary mb-4">
            ← Back
          </button>
          <h1 className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground text-center mb-4">
            Supplement Protocol
          </h1>
          <SupplementChecklist questStates={supplementQuestStates} onToggle={toggleQuest} />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (activeSection === 'settings') {
    return (
      <div className="min-h-screen bg-background pb-24 pt-4">
        <div className="mx-auto max-w-md px-4 space-y-4">
          <button onClick={() => setActiveSection(null)} className="font-mono text-xs text-primary">
            ← Back
          </button>
          <h1 className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground text-center mb-2">
            Settings
          </h1>

          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <label className="font-mono text-xs text-muted-foreground">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary/50"
              />
            </div>

            <button
              onClick={() => setShowReplay(true)}
              className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 font-mono text-xs text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
            >
              <RotateCcw className="h-4 w-4" />
              Replay Awakening Sequence
            </button>

            <button
              onClick={handleClearData}
              className="flex w-full items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 font-mono text-xs text-destructive/70 transition-all hover:border-destructive/50 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Clear All Data
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (activeSection === 'about') {
    return (
      <div className="min-h-screen bg-background pb-24 pt-4">
        <div className="mx-auto max-w-md px-4">
          <button onClick={() => setActiveSection(null)} className="font-mono text-xs text-primary mb-4">
            ← Back
          </button>
          <h1 className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground text-center mb-4">
            About The System
          </h1>
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <p className="font-tech text-sm text-muted-foreground leading-relaxed">
              The System is a genetically-calibrated productivity engine inspired by Solo Leveling.
              It monitors your biometrics, genetic profile, and behavioral patterns to assign
              optimal daily quests, track resistance, and push you toward Shadow Monarch status.
            </p>
            <p className="font-tech text-sm text-muted-foreground leading-relaxed">
              Your COMT Val/Val warrior gene, ACTN3 sprinter variant, and CYP1A2 slow caffeine
              metabolism are factored into every quest assignment, XP calculation, and recovery recommendation.
            </p>
            <p className="font-mono text-[10px] text-muted-foreground/50 text-center pt-2">
              The System watches. The System remembers.
            </p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Main menu
  return (
    <div className="min-h-screen bg-background pb-24 pt-4">
      <div className="mx-auto max-w-md space-y-2 px-4">
        <h1 className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground text-center mb-4">
          More
        </h1>

        <MenuItem icon={Dna} label="Genetic Profile" onClick={() => setActiveSection('genetics')} />
        <MenuItem icon={Backpack} label="Inventory" onClick={() => setActiveSection('inventory')} />
        <MenuItem icon={Pill} label="Supplement Protocol" onClick={() => setActiveSection('supplements')} />
        <MenuItem icon={BarChart3} label="System Analytics" isLink to="/system-analytics" />
        <MenuItem icon={Settings} label="Settings" onClick={() => setActiveSection('settings')} />
        <MenuItem icon={Info} label="About The System" onClick={() => setActiveSection('about')} />
      </div>

      <BottomNav />
    </div>
  );
};

export default More;
