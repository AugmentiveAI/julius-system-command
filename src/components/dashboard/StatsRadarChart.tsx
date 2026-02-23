import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { PlayerStats } from '@/types/player';

interface StatsRadarChartProps {
  stats: PlayerStats;
}

const STAT_LABELS: Record<keyof PlayerStats, string> = {
  sales: 'Sales',
  systems: 'Systems',
  creative: 'Creative',
  discipline: 'Discipline',
  network: 'Network',
  wealth: 'Wealth',
};

export const StatsRadarChart = ({ stats }: StatsRadarChartProps) => {
  if (!stats) return null;
  const chartData = Object.entries(stats).map(([key, value]) => ({
    stat: STAT_LABELS[key as keyof PlayerStats],
    value,
    fullMark: 100,
  }));

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 font-display text-xl font-bold text-foreground">
        Core Stats
      </h2>

      {/* Radar Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="hsl(240 15% 25%)" />
            <PolarAngleAxis
              dataKey="stat"
              tick={{ fill: 'hsl(210 40% 98%)', fontSize: 12, fontFamily: 'Rajdhani' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: 'hsl(215 20% 65%)', fontSize: 10 }}
              axisLine={false}
            />
            <Radar
              name="Stats"
              dataKey="value"
              stroke="hsl(187 100% 50%)"
              fill="hsl(187 100% 50%)"
              fillOpacity={0.3}
              strokeWidth={2}
              style={{
                filter: 'drop-shadow(0 0 8px hsl(187 100% 50% / 0.5))',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats List */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Object.entries(stats).map(([key, value]) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-md bg-muted px-3 py-2"
          >
            <span className="font-tech text-sm text-muted-foreground">
              {STAT_LABELS[key as keyof PlayerStats]}
            </span>
            <span className="font-display text-lg font-bold text-primary text-glow-primary">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
