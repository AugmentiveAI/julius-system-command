import { Search, Snowflake, Pill, Coffee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getSystemToast } from '@/utils/systemVoice';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SupplementChecklist } from '@/components/biometrics/SupplementChecklist';

interface DashboardActionsProps {
  onScan: () => void;
  onCold: () => void;
  onCaffeine: () => void;
  supplementStates: Record<string, boolean>;
  onToggleSupplement: (questId: string) => void;
}

export const DashboardActions = ({
  onScan,
  onCold,
  onCaffeine,
  supplementStates,
  onToggleSupplement,
}: DashboardActionsProps) => {
  const actions = [
    { icon: Search, label: 'Scan', onClick: onScan },
    { icon: Snowflake, label: 'Cold', onClick: onCold },
    { icon: Coffee, label: 'Caffeine', onClick: onCaffeine },
  ];

  return (
    <div className="flex items-center justify-center gap-5">
      {actions.map(({ icon: Icon, label, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          className="flex flex-col items-center gap-1 group"
          title={label}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card transition-all group-hover:border-primary/50 group-hover:bg-primary/10 group-hover:shadow-[0_0_12px_hsl(187_100%_50%/0.2)]">
            <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
        </button>
      ))}

      {/* Supplements popover */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex flex-col items-center gap-1 group" title="Supplements">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card transition-all group-hover:border-primary/50 group-hover:bg-primary/10 group-hover:shadow-[0_0_12px_hsl(187_100%_50%/0.2)]">
              <Pill className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">Supps</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="center" side="top">
          <p className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Supplement Stacks
          </p>
          <SupplementChecklist questStates={supplementStates} onToggle={onToggleSupplement} />
        </PopoverContent>
      </Popover>
    </div>
  );
};
