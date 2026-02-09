import { Eye } from 'lucide-react';

interface FocusFABProps {
  onClick: () => void;
  active: boolean;
}

export const FocusFAB = ({ onClick, active }: FocusFABProps) => {
  if (active) return null; // Hide FAB when already in focus mode

  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/90 backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-primary/10 hover:shadow-[0_0_12px_hsl(187_100%_50%/0.2)] active:scale-90"
      title="Focus Mode"
    >
      <Eye className="h-4 w-4 text-muted-foreground" />
    </button>
  );
};
