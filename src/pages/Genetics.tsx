import { JULIUS_GENETICS, GeneticTrait } from '@/types/genetics';
import { BottomNav } from '@/components/navigation/BottomNav';
import { SupplementChecklist } from '@/components/biometrics/SupplementChecklist';
import { useProtocolQuests } from '@/hooks/useProtocolQuests';
 
 const TraitCard = ({ trait, isBuff }: { trait: GeneticTrait; isBuff: boolean }) => {
   const bgClass = isBuff 
     ? 'bg-green-950/30 border-green-900/50' 
     : 'bg-red-950/30 border-red-900/50';
   
   return (
     <div className={`rounded-lg border p-4 ${bgClass}`}>
       <div className="flex items-start gap-3">
         <span className="text-2xl">{trait.icon}</span>
         <div className="flex-1">
           <div className="flex items-center justify-between">
             <h3 className="font-display text-lg font-semibold text-foreground">
               {trait.name}
             </h3>
             <span className="rounded bg-muted px-2 py-0.5 font-tech text-xs text-muted-foreground">
               {trait.gene}
             </span>
           </div>
           <p className="mt-1 text-sm text-muted-foreground">
             {isBuff ? trait.effect : trait.optimization}
           </p>
         </div>
       </div>
     </div>
   );
 };
 
 const Genetics = () => {
  const buffs = JULIUS_GENETICS.traits.filter(t => t.type === 'buff');
    const debuffs = JULIUS_GENETICS.traits.filter(t => t.type === 'debuff');
    const { quests, toggleQuest } = useProtocolQuests();

    const supplementQuestStates = quests.reduce<Record<string, boolean>>((acc, q) => {
      if (q.id.includes('supplements')) acc[q.id] = q.completed;
      return acc;
    }, {});

    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="mx-auto max-w-2xl px-4 py-6">
          {/* Header */}
          <header className="mb-8 text-center">
            <h1 className="font-display text-2xl font-bold tracking-wider text-primary text-glow-primary">
              [ THE SYSTEM ]
            </h1>
            <p className="mt-1 font-tech text-sm text-muted-foreground">
              Genetic Profile
            </p>
          </header>

          {/* Archetype Card */}
          <div className="mb-8 rounded-lg border border-border bg-card p-6 text-center">
            <p className="font-tech text-sm uppercase tracking-wider text-muted-foreground">
              Genetic Archetype
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold text-primary text-glow-primary">
              {JULIUS_GENETICS.archetype}
            </h2>
          </div>

          {/* Active Buffs */}
          <section className="mb-8">
            <h2 className="mb-4 font-display text-lg font-semibold text-green-400">
              Active Buffs
            </h2>
            <div className="space-y-3">
              {buffs.map(trait => (
                <TraitCard key={trait.id} trait={trait} isBuff={true} />
              ))}
            </div>
          </section>

          {/* Active Debuffs */}
          <section className="mb-8">
            <h2 className="mb-4 font-display text-lg font-semibold text-red-400">
              Active Debuffs
            </h2>
            <div className="space-y-3">
              {debuffs.map(trait => (
                <TraitCard key={trait.id} trait={trait} isBuff={false} />
              ))}
            </div>
          </section>

          {/* Daily Supplement Protocol */}
          <section>
            <h2 className="mb-4 font-display text-lg font-semibold text-primary">
              Daily Supplement Protocol
            </h2>
            <SupplementChecklist
              questStates={supplementQuestStates}
              onToggle={toggleQuest}
            />
          </section>
        </div>
 
       <BottomNav />
     </div>
   );
 };
 
 export default Genetics;