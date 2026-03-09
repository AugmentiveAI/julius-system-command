import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface KeyRequiredModalProps {
  open: boolean;
  onClose: () => void;
  dungeonTitle: string;
  keyName: string;
  ownedKeys: number;
}

export function KeyRequiredModal({ open, onClose, dungeonTitle, keyName, ownedKeys }: KeyRequiredModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Lock className="h-5 w-5" />
            Key Required
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted-foreground pt-2">
            <strong className="text-foreground">{dungeonTitle}</strong> requires a <strong className="text-primary">{keyName}</strong> to enter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="font-tech text-sm text-foreground">{keyName}</span>
            </div>
            <span className={`font-mono text-sm font-bold ${ownedKeys > 0 ? 'text-primary' : 'text-destructive'}`}>
              {ownedKeys} owned
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 font-mono text-xs"
            >
              CANCEL
            </Button>
            <Button
              onClick={() => { onClose(); navigate('/store'); }}
              className="flex-1 font-mono text-xs"
            >
              GO TO STORE
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
