import { Link, useLocation } from 'react-router-dom';
import { Home, Scroll, Dumbbell, Trophy, Dna, Backpack, BookOpen } from 'lucide-react';
import { useCurrentMode } from '@/components/dashboard/CurrentStateCard';

const navItems = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/quests', label: 'Quests', icon: Scroll },
  { path: '/training', label: 'Training', icon: Dumbbell },
  { path: '/milestones', label: 'Milestones', icon: Trophy },
  { path: '/genetics', label: 'Genetics', icon: Dna },
  { path: '/inventory', label: 'Inventory', icon: Backpack },
  { path: '/history', label: 'History', icon: BookOpen },
];

const MODE_DOT_COLORS: Record<string, string> = {
  push: 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]',
  steady: 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.6)]',
  recover: 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]',
};

export const BottomNav = () => {
  const location = useLocation();
  const currentMode = useCurrentMode();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-around py-2">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          const showDot = path === '/' && currentMode;
          return (
            <Link
              key={path}
              to={path}
              className={`relative flex flex-col items-center gap-1 px-6 py-2 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`h-6 w-6 ${isActive ? 'text-glow-primary' : ''}`}
                  style={
                    isActive
                      ? { filter: 'drop-shadow(0 0 6px hsl(187 100% 50% / 0.6))' }
                      : undefined
                  }
                />
                {showDot && (
                  <span className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${MODE_DOT_COLORS[currentMode]}`} />
                )}
              </div>
              <span className="font-tech text-xs">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
