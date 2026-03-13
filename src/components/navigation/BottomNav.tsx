import { Link, useLocation } from 'react-router-dom';
import { Swords, Dumbbell, Eye, Crown } from 'lucide-react';
import { hapticTap } from '@/utils/haptics';

// TODO: Phase2-IP-rebrand — "Hunter" terminology, rank aesthetic
const navItems = [
  { path: '/', label: 'TODAY', icon: Swords },
  { path: '/training', label: 'TRAIN', icon: Dumbbell },
  { path: '/intel', label: 'INTEL', icon: Eye },
  { path: '/system', label: 'SYSTEM', icon: Crown },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/95 backdrop-blur-sm z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around py-1.5">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(path);

          return (
            <Link
              key={path}
              to={path}
              onTouchStart={hapticTap}
              className={`relative flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-mono text-[9px] tracking-[0.15em] font-medium">{label}</span>
              {/* Active indicator — subtle purple glow underline */}
              {isActive && (
                <span
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full bg-primary"
                  style={{ boxShadow: '0 0 8px hsl(263 91% 66% / 0.6)' }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
