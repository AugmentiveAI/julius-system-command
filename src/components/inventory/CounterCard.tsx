import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CounterCardProps {
  title: string;
  icon: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
}

export const CounterCard = ({ title, icon, value, onChange }: CounterCardProps) => {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
      </div>
      
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="h-10 w-10 border-primary/50 text-primary hover:bg-primary/20"
        >
          <Minus className="h-4 w-4" />
        </Button>
        
        <span className="font-display text-4xl font-bold text-primary min-w-[80px] text-center">
          {value}
        </span>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => onChange(value + 1)}
          className="h-10 w-10 border-primary/50 text-primary hover:bg-primary/20"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
