import { useState, useEffect } from 'react';
import { LootItem, RARITY_CONFIG, LootRarity } from '@/types/loot';

interface LootCinematicRevealProps {
  item: LootItem | null;
  show: boolean;
  onDone: () => void;
}

/**
 * Full-screen cinematic reveal for Rare/Epic/Legendary drops.
 * Inspired by Solo Leveling's item extraction moments.
 */
export const LootCinematicReveal = ({ item, show, onDone }: LootCinematicRevealProps) => {
  const [phase, setPhase] = useState<'hidden' | 'flash' | 'reveal' | 'details' | 'fadeout'>('hidden');

  useEffect(() => {
    if (show && item) {
      setPhase('flash');
      const t1 = setTimeout(() => setPhase('reveal'), 300);
      const t2 = setTimeout(() => setPhase('details'), 1000);
      const t3 = setTimeout(() => setPhase('fadeout'), 4000);
      const t4 = setTimeout(() => {
        setPhase('hidden');
        onDone();
      }, 4500);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    }
  }, [show, item, onDone]);

  if (phase === 'hidden' || !item) return null;

  const config = RARITY_CONFIG[item.rarity];
  const categoryIcon = getCinematicIcon(item.category);
  const glowColor = `hsl(${config.color})`;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
        phase === 'fadeout' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-md" />

      {/* Rarity-colored radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, hsl(${config.color} / 0.15) 0%, transparent 70%)`,
          animation: phase === 'flash' ? 'cinematic-flash 0.3s ease-out' : undefined,
        }}
      />

      {/* Particle field */}
      {(item.rarity === 'epic' || item.rarity === 'legendary') && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: item.rarity === 'legendary' ? 20 : 10 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                backgroundColor: glowColor,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: 0.3 + Math.random() * 0.5,
                animation: `cinematic-particle ${2 + Math.random() * 3}s ease-in-out infinite alternate`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 text-center px-8 max-w-sm">
        {/* Rarity badge */}
        <div
          className={`transition-all duration-700 ${
            phase === 'flash' ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
          }`}
        >
          <p
            className={`font-display text-xs uppercase tracking-[0.3em] mb-6 ${config.textClass}`}
            style={{ textShadow: `0 0 20px hsl(${config.color} / 0.8)` }}
          >
            {getRarityAnnouncement(item.rarity)}
          </p>
        </div>

        {/* Item icon */}
        <div
          className={`text-6xl mb-4 transition-all duration-700 ${
            phase === 'reveal' || phase === 'details' || phase === 'fadeout'
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-150'
          }`}
        >
          {categoryIcon}
        </div>

        {/* Item name */}
        <h2
          className={`font-display text-2xl font-bold mb-3 transition-all duration-700 ${config.textClass} ${
            phase === 'reveal' || phase === 'details' || phase === 'fadeout'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
          style={{ textShadow: `0 0 30px hsl(${config.color} / 0.7)` }}
        >
          {item.name}
        </h2>

        {/* Details */}
        <div
          className={`transition-all duration-500 ${
            phase === 'details' || phase === 'fadeout'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            {item.description}
          </p>

          {/* System voice line */}
          <p
            className={`font-display text-xs italic tracking-wider ${config.textClass} opacity-80`}
          >
            "{item.systemLine}"
          </p>
        </div>
      </div>

      <style>{`
        @keyframes cinematic-flash {
          0% { opacity: 0; }
          30% { opacity: 1; }
          100% { opacity: 0.15; }
        }
        @keyframes cinematic-particle {
          0% { transform: translateY(0) scale(1); opacity: 0.3; }
          100% { transform: translateY(-20px) scale(1.5); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

function getCinematicIcon(category: string): string {
  switch (category) {
    case 'tactical_insight': return '📜';
    case 'system_upgrade': return '⚙️';
    case 'template': return '📋';
    case 'stat_bonus': return '⚡';
    case 'title': return '👑';
    default: return '🎁';
  }
}

function getRarityAnnouncement(rarity: LootRarity): string {
  switch (rarity) {
    case 'rare': return '◈ Rare Item Acquired ◈';
    case 'epic': return '◆ Epic Item Acquired ◆';
    case 'legendary': return '★ LEGENDARY ITEM ACQUIRED ★';
    default: return 'Item Acquired';
  }
}
