import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';

interface DataMigrationDialogProps {
  open: boolean;
  migrating: boolean;
  summary: {
    playerLevel: number;
    playerXP: number;
    questsCompleted: number;
    hasInventory: boolean;
  };
  onAccept: () => void;
  onSkip: () => void;
}

export function DataMigrationDialog({
  open,
  migrating,
  summary,
  onAccept,
  onSkip,
}: DataMigrationDialogProps) {
  const details: string[] = [];
  if (summary.playerLevel > 1) details.push(`Level ${summary.playerLevel} (${summary.playerXP.toLocaleString()} XP)`);
  if (summary.questsCompleted > 0) details.push(`${summary.questsCompleted} quest${summary.questsCompleted === 1 ? '' : 's'} completed`);
  if (summary.hasInventory) details.push('Inventory data');

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="border-primary/30 bg-background max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-mono text-primary tracking-wider text-base">
            [LOCAL DATA DETECTED]
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm space-y-3 pt-2">
            <span className="block">
              Existing progress found on this device. Merge it into your cloud account?
            </span>
            {details.length > 0 && (
              <span className="block font-mono text-xs text-primary/80 space-y-1">
                {details.map((d, i) => (
                  <span key={i} className="block">▸ {d}</span>
                ))}
              </span>
            )}
            <span className="block text-xs text-muted-foreground/60">
              Skipping will start fresh. This cannot be undone.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={onAccept}
            disabled={migrating}
            className="w-full gap-2 font-mono uppercase tracking-wider text-xs"
          >
            {migrating ? (
              <>
                <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Merging…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Merge to Cloud
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={onSkip}
            disabled={migrating}
            className="w-full gap-2 text-xs text-muted-foreground"
          >
            <X className="w-3 h-3" />
            Start Fresh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
