import { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CurrencyCardProps {
  title: string;
  value: number;
  onChange: (value: number) => void;
}

export const CurrencyCard = ({ title, value, onChange }: CurrencyCardProps) => {
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setInputValue(raw);
  };

  const handleBlur = () => {
    const parsed = parseInt(inputValue, 10) || 0;
    const validated = Math.max(0, Math.min(999999999, parsed));
    onChange(validated);
    setInputValue(validated.toString());
  };

  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
      </div>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-tech text-muted-foreground">
          $
        </span>
        <Input
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className="bg-background border-border pl-7 font-display text-2xl text-primary"
          maxLength={12}
        />
      </div>

      <p className="mt-2 font-tech text-sm text-muted-foreground text-center">
        Current: {formattedValue}
      </p>
    </div>
  );
};
