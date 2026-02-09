import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardMessageProps {
  message: string;
}

export const DashboardMessage = ({ message }: DashboardMessageProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`space-y-4 transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div
        className="rounded-lg border border-primary/30 bg-card/80 p-5"
        style={{
          boxShadow: '0 0 20px hsl(187 100% 50% / 0.1), inset 0 0 20px hsl(187 100% 50% / 0.03)',
        }}
      >
        <p className="font-display text-[10px] uppercase tracking-[0.3em] text-primary/60 mb-2">
          ◈ System
        </p>
        <p className="font-tech text-lg text-foreground leading-snug">
          "{message}"
        </p>
      </div>

      <Link
        to="/quests"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-6 py-3.5 font-display text-xs uppercase tracking-[0.2em] text-primary transition-all hover:bg-primary/20 hover:shadow-[0_0_20px_hsl(187_100%_50%/0.3)]"
      >
        Start Today's Quests
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
};
