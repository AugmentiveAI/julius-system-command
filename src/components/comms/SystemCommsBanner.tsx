import { Radio } from 'lucide-react';
import { SystemComm } from '@/hooks/useSystemComms';

interface SystemCommsBannerProps {
  comm: SystemComm | null;
  visible: boolean;
  onDismiss: () => void;
}

export const SystemCommsBanner = ({ comm, visible, onDismiss }: SystemCommsBannerProps) => {
  if (!comm) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[90] transition-transform duration-400 ease-out ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
      style={{ transitionDuration: '400ms' }}
    >
      <button
        onClick={onDismiss}
        className="w-full text-left"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <div
          className="mx-auto max-w-md border-b border-border bg-card/95 backdrop-blur-sm px-4 py-3 flex items-center gap-3"
          style={{ borderLeft: '3px solid hsl(187 100% 50% / 0.6)', paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
        >
          <Radio className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          <p className="font-mono text-[11px] text-foreground/90 leading-snug">
            {comm.message}
          </p>
        </div>
      </button>
    </div>
  );
};
