import { useState, useEffect, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface SystemMessage {
  id: string;
  text: string;
  priority: 'insight' | 'warning' | 'critical';
}

interface SystemMessageCardProps {
  messages: SystemMessage[];
}

const BORDER_COLORS = {
  insight: 'border-l-primary',
  warning: 'border-l-yellow-500',
  critical: 'border-l-red-500',
};

export function SystemMessageCard({ messages }: SystemMessageCardProps) {
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = useState(0);

  // Auto-rotate every 60 seconds
  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % messages.length);
    }, 60000);
    return () => clearInterval(interval);
  }, [messages.length]);

  if (messages.length === 0) return null;

  const msg = messages[Math.min(activeIdx, messages.length - 1)];

  return (
    <button
      onClick={() => navigate('/intel')}
      className={`w-full rounded-lg border border-border/50 bg-card/50 p-3 text-left transition-all hover:border-primary/30 border-l-[3px] ${BORDER_COLORS[msg.priority]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase mb-1">
            THE SYSTEM
          </p>
          <p className="font-mono text-xs text-foreground/90 leading-relaxed line-clamp-2">
            {msg.text}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-3" />
      </div>
      {messages.length > 1 && (
        <div className="flex gap-1 mt-2">
          {messages.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === activeIdx % messages.length ? 'w-4 bg-primary' : 'w-1 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      )}
    </button>
  );
}
