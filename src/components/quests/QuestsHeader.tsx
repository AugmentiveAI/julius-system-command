import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

function getTimeUntilMidnight(): { hours: number; minutes: number } {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  
  const diff = midnight.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { hours, minutes };
}

interface QuestsHeaderProps {
  completedCount: number;
  totalCount: number;
}

export const QuestsHeader = ({ completedCount, totalCount }: QuestsHeaderProps) => {
  const [timeUntilReset, setTimeUntilReset] = useState(getTimeUntilMidnight);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntilReset(getTimeUntilMidnight());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const allComplete = completedCount === totalCount;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Daily Quests
          </h1>
          <p
            className={`mt-1 font-tech text-lg ${
              allComplete ? 'text-green-400' : 'text-muted-foreground'
            }`}
          >
            {completedCount}/{totalCount} Completed
          </p>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="font-tech text-sm">
            Resets in {timeUntilReset.hours}h {timeUntilReset.minutes}m
          </span>
        </div>
      </div>

      {allComplete && (
        <div className="mt-3 rounded-md bg-green-500/10 px-3 py-2 text-center">
          <p className="font-tech text-sm text-green-400">
            All quests complete. The System is pleased.
          </p>
        </div>
      )}
    </div>
  );
};
