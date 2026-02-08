import { PreCommitment } from '@/utils/persuasionEngine';
import { Swords, Check, X } from 'lucide-react';

interface PreCommitmentBannerProps {
  commitment: PreCommitment;
  onHonored: () => void;
  questCompleted: boolean;
}

export const PreCommitmentBanner = ({
  commitment,
  onHonored,
  questCompleted,
}: PreCommitmentBannerProps) => {
  const acceptedTime = commitment.acceptedAt
    ? new Date(commitment.acceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'last night';

  // Already resolved
  if (commitment.completed === true) {
    return (
      <div className="rounded-lg border border-green-500/40 bg-green-500/5 p-3 animate-fade-in">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-400 shrink-0" />
          <p className="font-mono text-[11px] text-green-400 leading-snug">
            Pre-commitment honored. +25 bonus XP. Commitment consistency updated.
          </p>
        </div>
      </div>
    );
  }

  if (commitment.completed === false) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-3 animate-fade-in">
        <div className="flex items-center gap-2">
          <X className="h-4 w-4 text-red-400 shrink-0" />
          <p className="font-mono text-[11px] text-red-400 leading-snug">
            Pre-commitment broken. The System has logged this. Trust is earned, not given.
          </p>
        </div>
      </div>
    );
  }

  // Active commitment — quest completed via normal flow
  if (questCompleted) {
    // Auto-honor
    onHonored();
    return null;
  }

  // Active, unresolved
  return (
    <div
      className="rounded-lg border-2 p-3 animate-fade-in"
      style={{
        borderColor: 'hsl(45 100% 50% / 0.4)',
        backgroundColor: 'hsl(45 100% 50% / 0.03)',
        boxShadow: '0 0 15px hsl(45 100% 50% / 0.08)',
      }}
    >
      <div className="flex items-start gap-2.5">
        <Swords className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[11px] text-muted-foreground leading-snug">
            Last night at <span className="text-foreground font-semibold">{acceptedTime}</span>, you accepted this quest:
          </p>
          <p className="font-tech text-sm text-yellow-400 font-semibold mt-1">
            "{commitment.questName}"
          </p>
          <p className="font-mono text-[10px] text-muted-foreground/80 mt-1 italic">
            The System remembers.
          </p>
        </div>
      </div>
    </div>
  );
};
