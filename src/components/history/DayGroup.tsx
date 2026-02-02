import { Sparkles } from 'lucide-react';
import { DaySummary } from '@/types/history';

interface DayGroupProps {
  day: DaySummary;
}

export const DayGroup = ({ day }: DayGroupProps) => {
  const dateDisplay = new Date(day.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const isToday = day.date === new Date().toISOString().split('T')[0];

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Day Header */}
      <div className="flex items-center justify-between bg-muted/50 px-4 py-2">
        <h3 className="font-display text-sm font-bold text-foreground">
          {isToday ? 'Today' : dateDisplay}
        </h3>
        <div className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="font-tech text-sm text-primary">+{day.totalXP} XP</span>
        </div>
      </div>

      {/* Entries */}
      <div className="divide-y divide-border">
        {day.entries.map(entry => {
          const time = new Date(entry.completedAt).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });

          return (
            <div
              key={entry.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-2 w-2 rounded-full ${
                    entry.type === 'main' ? 'bg-secondary' : 'bg-primary'
                  }`}
                />
                <div>
                  <p className="font-tech text-sm text-foreground">
                    {entry.questTitle}
                  </p>
                  <p className="font-tech text-xs text-muted-foreground">
                    {entry.type === 'main' ? 'Main Quest' : 'Daily Quest'} • {time}
                  </p>
                </div>
              </div>
              <span className="font-tech text-sm text-primary">
                +{entry.xpEarned}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
