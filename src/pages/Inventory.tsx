import { useState, useEffect } from 'react';
import { Bot, Users, Brain, FileCode, RotateCcw, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BottomNav } from '@/components/navigation/BottomNav';
import { CounterCard } from '@/components/inventory/CounterCard';
import { ListCard } from '@/components/inventory/ListCard';
import { CurrencyCard } from '@/components/inventory/CurrencyCard';
import { useInventory } from '@/hooks/useInventory';
import { GeneticHUD } from '@/components/genetic/GeneticHUD';
import { AwakeningSequence } from '@/components/onboarding/AwakeningSequence';

const Inventory = () => {
  const [showReplay, setShowReplay] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const stored = localStorage.getItem('systemStartDate');
    return stored || new Date().toISOString().split('T')[0];
  });

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setStartDate(newDate);
    localStorage.setItem('systemStartDate', newDate);
  };
  const {
    inventory,
    setAutomationsDeployed,
    setCashReserves,
    addClient,
    removeClient,
    addSkill,
    removeSkill,
    addTemplate,
    removeTemplate,
  } = useInventory();

  if (showReplay) {
    return <AwakeningSequence onComplete={() => setShowReplay(false)} isReplay />;
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-6">
      <GeneticHUD />
      <div className="mx-auto max-w-2xl space-y-4 px-4 mt-3">
        {/* System Header */}
        <div className="text-center">
          <h1 className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
            [ The System ]
          </h1>
        </div>

        {/* Page Header */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-display text-xl font-bold text-foreground text-center">
            Inventory
          </h2>
          <p className="mt-1 font-tech text-xs text-muted-foreground text-center">
            Assets and resources accumulated on your journey.
          </p>
        </div>

        {/* Grid Layout */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Automations Deployed */}
          <CounterCard
            title="Automations Deployed"
            icon={<Bot className="h-5 w-5 text-primary" />}
            value={inventory.automationsDeployed}
            onChange={setAutomationsDeployed}
          />

          {/* Cash Reserves */}
          <CurrencyCard
            title="Cash Reserves / Runway"
            value={inventory.cashReserves}
            onChange={setCashReserves}
          />
        </div>

        {/* Active Clients */}
        <ListCard
          title="Active Clients"
          icon={<Users className="h-5 w-5 text-secondary" />}
          items={inventory.activeClients}
          onAdd={addClient}
          onRemove={removeClient}
          placeholder="Add new client..."
        />

        {/* Skills Created */}
        <ListCard
          title="Skills Created"
          icon={<Brain className="h-5 w-5 text-primary" />}
          items={inventory.skillsCreated}
          onAdd={addSkill}
          onRemove={removeSkill}
          placeholder="Add new skill..."
        />

        {/* Templates & Frameworks */}
        <ListCard
          title="Templates & Frameworks"
          icon={<FileCode className="h-5 w-5 text-secondary" />}
          items={inventory.templatesFrameworks}
          onAdd={addTemplate}
          onRemove={removeTemplate}
          placeholder="Add new template..."
        />

        {/* System Section */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="font-display text-sm font-semibold text-foreground">System</h3>
          
          <div className="flex items-center gap-3">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <label className="font-mono text-xs text-muted-foreground shrink-0">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary/50"
            />
          </div>

          <button
            onClick={() => setShowReplay(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5 font-mono text-xs text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Replay Awakening Sequence
          </button>
        </div>

        {/* Hidden analytics link */}
        <div className="text-center pt-4">
          <Link to="/system-analytics" className="font-mono text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">
            System Analytics
          </Link>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Inventory;
