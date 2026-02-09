interface TodaySnapshotProps {
  questsCompleted: number;
  questsTotal: number;
  xpToday: number;
  streak: number;
}

export const TodaySnapshot = ({ questsCompleted, questsTotal, xpToday, streak }: TodaySnapshotProps) => {
  return (
    <div className="flex items-center justify-around py-3">
      <div className="text-center">
        <p className="font-display text-xl font-bold text-foreground">
          {questsCompleted}/{questsTotal}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">QUESTS ✓</p>
      </div>

      <div className="h-8 w-px bg-border" />

      <div className="text-center">
        <p className="font-display text-xl font-bold text-primary text-glow-primary">
          +{xpToday}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">XP TODAY</p>
      </div>

      <div className="h-8 w-px bg-border" />

      <div className="text-center">
        <p className="font-display text-xl font-bold text-secondary text-glow-secondary">
          🔥 {streak}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">STREAK</p>
      </div>
    </div>
  );
};
