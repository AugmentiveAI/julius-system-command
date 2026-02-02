import { Bot, Users, Brain, FileCode } from 'lucide-react';
import { BottomNav } from '@/components/navigation/BottomNav';
import { CounterCard } from '@/components/inventory/CounterCard';
import { ListCard } from '@/components/inventory/ListCard';
import { CurrencyCard } from '@/components/inventory/CurrencyCard';
import { useInventory } from '@/hooks/useInventory';

const Inventory = () => {
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

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-6">
      <div className="mx-auto max-w-2xl space-y-4">
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
      </div>

      <BottomNav />
    </div>
  );
};

export default Inventory;
