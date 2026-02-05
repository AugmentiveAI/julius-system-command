import { Link, useLocation } from 'react-router-dom';
 import { Home, Scroll, Trophy, Dna, Backpack, BookOpen } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/quests', label: 'Quests', icon: Scroll },
  { path: '/milestones', label: 'Milestones', icon: Trophy },
   { path: '/genetics', label: 'Genetics', icon: Dna },
  { path: '/inventory', label: 'Inventory', icon: Backpack },
  { path: '/history', label: 'History', icon: BookOpen },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-around py-2">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-1 px-6 py-2 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon
                className={`h-6 w-6 ${isActive ? 'text-glow-primary' : ''}`}
                style={
                  isActive
                    ? { filter: 'drop-shadow(0 0 6px hsl(187 100% 50% / 0.6))' }
                    : undefined
                }
              />
              <span className="font-tech text-xs">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
