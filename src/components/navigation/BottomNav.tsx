import { Link, useLocation } from 'react-router-dom';
import { Home, Swords, Dumbbell, TrendingUp, MoreHorizontal } from 'lucide-react';
import { useCurrentMode } from '@/components/dashboard/CurrentStateCard';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/quests', label: 'Quests', icon: Swords },
  { path: '/training', label: 'Train', icon: Dumbbell },
  { path: '/progress', label: 'Progress', icon: TrendingUp },
  { path: '/more', label: 'More', icon: MoreHorizontal },
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
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-sm" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          const showDot = path === '/' && currentMode;
          return (
            <Link
              key={path}
              to={path}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-2 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`h-5 w-5`}
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
              <span className="font-tech text-[10px] leading-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
