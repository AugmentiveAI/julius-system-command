import { Slider } from '@/components/ui/slider';

interface RPESliderProps {
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
}

const RPE_DESCRIPTORS: Record<number, string> = {
  1: 'Very light',
  2: 'Light',
  3: 'Light',
  4: 'Moderate',
  5: 'Moderate',
  6: 'Hard',
  7: 'Hard',
  8: 'Very hard',
  9: 'Near max',
  10: 'Max effort',
};

const RPE_COLORS: Record<number, string> = {
  1: 'text-blue-400',
  2: 'text-blue-400',
  3: 'text-blue-300',
  4: 'text-green-400',
  5: 'text-green-400',
  6: 'text-amber-400',
  7: 'text-amber-400',
  8: 'text-orange-400',
  9: 'text-red-400',
  10: 'text-red-500',
};

export function RPESlider({ value, onChange, compact = false }: RPESliderProps) {
  return (
    <div className={`space-y-1 ${compact ? '' : 'space-y-2'}`}>
      {!compact && (
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">RPE</span>
          <div className="flex items-center gap-1.5">
            <span className={`font-mono text-sm font-bold ${RPE_COLORS[value]}`}>{value}</span>
            <span className={`font-mono text-[10px] ${RPE_COLORS[value]}`}>{RPE_DESCRIPTORS[value]}</span>
          </div>
        </div>
      )}
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={1}
        max={10}
        step={1}
        className="w-full"
      />
      {compact && (
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] text-muted-foreground">Easy</span>
          <span className={`font-mono text-[10px] font-bold ${RPE_COLORS[value]}`}>RPE {value}</span>
          <span className="font-mono text-[9px] text-muted-foreground">Max</span>
        </div>
      )}
    </div>
  );
}
