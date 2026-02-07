import { Sun, Pill, Moon, Check } from 'lucide-react';

interface SupplementStack {
  id: string;
  questId: string;
  label: string;
  time: string;
  icon: React.ElementType;
  items: string[];
  geneticReason: string;
}

const STACKS: SupplementStack[] = [
  {
    id: 'morning',
    questId: 'morning-supplements',
    label: 'Morning Stack',
    time: 'With breakfast',
    icon: Sun,
    items: ['Vitamin D3 + K2', 'Omega-3 (DHA)', 'Creatine 5g', 'L-Tyrosine 500mg'],
    geneticReason: 'COMT Val/Val needs tyrosine for dopamine synthesis',
  },
  {
    id: 'midday',
    questId: 'midday-supplements',
    label: 'Midday Stack',
    time: 'With lunch',
    icon: Pill,
    items: ['Lutein 10mg', 'Zeaxanthin 2mg', 'Choline 300mg'],
    geneticReason: 'CFH variant requires macular protection',
  },
  {
    id: 'evening',
    questId: 'evening-supplements',
    label: 'Evening Stack',
    time: 'Before bed',
    icon: Moon,
    items: ['Magnesium Glycinate 400mg', 'Zinc 15mg'],
    geneticReason: 'APOE e4 benefits from sleep optimization',
  },
];

interface SupplementChecklistProps {
  questStates: Record<string, boolean>;
  onToggle: (questId: string) => void;
}

export const SupplementChecklist = ({ questStates, onToggle }: SupplementChecklistProps) => {
  return (
    <div className="space-y-3">
      {STACKS.map(stack => {
        const Icon = stack.icon;
        const done = !!questStates[stack.questId];

        return (
          <button
            key={stack.id}
            onClick={() => onToggle(stack.questId)}
            className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all ${
              done
                ? 'border-green-500/30 bg-green-500/10'
                : 'border-border bg-card/50 hover:border-primary/50'
            }`}
          >
            <div
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                done
                  ? 'border-green-500 bg-green-500'
                  : 'border-muted-foreground'
              }`}
            >
              {done && <Check className="h-3 w-3 text-white" />}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${done ? 'text-green-400' : 'text-primary'}`} />
                <span className="font-display text-sm font-bold text-foreground">
                  {stack.label}
                </span>
                <span className="text-xs text-muted-foreground">{stack.time}</span>
              </div>

              <p className="font-tech text-xs text-muted-foreground">
                {stack.items.join(' · ')}
              </p>

              <p className="font-tech text-xs text-primary">
                🧬 {stack.geneticReason}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
