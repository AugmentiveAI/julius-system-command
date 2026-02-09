import { useState, useEffect, useMemo } from 'react';
import { PreCommitment } from '@/utils/persuasionEngine';
import { DIFFICULTY_BADGE_CONFIG, QuestDifficulty } from '@/types/questDifficulty';
import { Swords, Clock, Zap, X, Brain, Target } from 'lucide-react';
import { PILLAR_QUESTS } from '@/data/pillarQuests';
import { getDayProfile } from '@/utils/weeklyRhythm';
import { PILLAR_CONFIG, Pillar } from '@/types/pillarQuests';

interface PreCommitmentModalProps {
  commitment: PreCommitment;
  isRecovery: boolean;
  onAccept: () => void;
  onRequestAlternative: () => void;
  onDismiss: () => void;
}

export const PreCommitmentModal = ({
  commitment,
  isRecovery,
  onAccept,
  onRequestAlternative,
  onDismiss,
}: PreCommitmentModalProps) => {
  const [accepted, setAccepted] = useState(false);
  const [visible, setVisible] = useState(false);

  // Get tomorrow's pillars for preview
  const tomorrowPillars = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayProfile = getDayProfile(tomorrow);
    return PILLAR_QUESTS.filter(q => q.dayTypes.includes(dayProfile.dayType));
  }, []);

  // Fade in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const diffConfig = DIFFICULTY_BADGE_CONFIG[commitment.questDifficulty as QuestDifficulty];
  const acceptTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleAccept = () => {
    setAccepted(true);
    setTimeout(() => onAccept(), 2500);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onDismiss} />

      {/* Modal card */}
      <div
        className={`relative z-10 mx-4 w-full max-w-md rounded-xl border bg-card p-0 overflow-hidden transition-all duration-500 ${
          visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        } ${isRecovery ? 'border-secondary/40' : 'border-primary/40'}`}
        style={{
          boxShadow: isRecovery
            ? '0 0 40px hsl(263 91% 66% / 0.15), 0 0 80px hsl(263 91% 66% / 0.05)'
            : '0 0 40px hsl(187 100% 50% / 0.15), 0 0 80px hsl(187 100% 50% / 0.05)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors z-20"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header bar */}
        <div
          className={`px-6 py-4 border-b ${
            isRecovery
              ? 'border-secondary/20 bg-secondary/5'
              : 'border-primary/20 bg-primary/5'
          }`}
        >
          <div className="flex items-center gap-2">
            <Swords className={`h-5 w-5 ${isRecovery ? 'text-secondary' : 'text-primary'}`} />
            <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              System Directive
            </span>
          </div>
          <h2 className="font-display text-lg font-bold text-foreground mt-2">
            {isRecovery ? "Tomorrow's Suggested Focus" : "⚔️ Tomorrow's Challenge"}
          </h2>
          <p className="font-mono text-[11px] text-muted-foreground mt-1">
            {isRecovery
              ? 'The System has identified a manageable quest for your recovery.'
              : 'The System has selected your primary quest for tomorrow.'}
          </p>
        </div>

        {/* Quest display */}
        {!accepted ? (
          <>
            <div className="px-6 py-5 space-y-4">
              {/* Quest card */}
              <div
                className={`rounded-lg border p-4 ${
                  isRecovery
                    ? 'border-secondary/30 bg-secondary/5'
                    : 'border-primary/30 bg-primary/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`inline-flex items-center justify-center h-7 w-7 rounded text-xs font-mono font-bold border shrink-0 ${diffConfig?.className ?? ''}`}
                    style={diffConfig?.glow ? { boxShadow: diffConfig.glow } : undefined}
                  >
                    {commitment.questDifficulty}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-tech text-base font-semibold text-foreground">
                      {commitment.questName}
                    </h3>
                    <div className="mt-1.5 flex items-center gap-3 text-xs flex-wrap">
                      <span className="text-secondary font-medium">{commitment.questCategory}</span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {commitment.questEstimatedMinutes}m
                      </span>
                      <span className="text-primary font-semibold flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        +{commitment.questXP} XP
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Persuasion message */}
              <p className={`font-mono text-xs italic leading-relaxed ${
                isRecovery ? 'text-secondary/80' : 'text-foreground/80'
              }`}>
              {commitment.commitMessage}
              </p>

              {/* Tomorrow's Pillars Preview */}
              {tomorrowPillars.length > 0 && (
                <div className="space-y-2">
                  <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    Tomorrow's Pillars
                  </p>
                  <div className="flex gap-2">
                    {tomorrowPillars.map(pq => {
                      const cfg = PILLAR_CONFIG[pq.pillar];
                      const Icon = pq.pillar === 'mind' ? Brain : pq.pillar === 'body' ? Zap : Target;
                      return (
                        <div
                          key={pq.id}
                          className={`flex-1 rounded-md border p-2 text-center ${cfg.glowClass} bg-card/50`}
                        >
                          <Icon className={`h-4 w-4 mx-auto ${cfg.color}`} />
                          <p className="font-mono text-[9px] text-muted-foreground mt-1 truncate">
                            {pq.title}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="px-6 pb-6 space-y-2">
              <button
                onClick={handleAccept}
                className={`w-full py-3 rounded-lg font-mono text-sm tracking-[0.1em] font-semibold transition-all ${
                  isRecovery
                    ? 'bg-secondary/15 border border-secondary/50 text-secondary hover:bg-secondary/25'
                    : 'bg-primary/15 border border-primary/50 text-primary hover:bg-primary/25'
                }`}
                style={{
                  boxShadow: isRecovery
                    ? '0 0 20px hsl(263 91% 66% / 0.2)'
                    : '0 0 20px hsl(187 100% 50% / 0.2)',
                }}
              >
                {isRecovery ? "I'LL TRY" : 'I ACCEPT THIS QUEST'}
              </button>
              <button
                onClick={onRequestAlternative}
                disabled={commitment.alternativeUsed}
                className={`w-full py-2.5 rounded-lg font-mono text-xs tracking-[0.1em] transition-all border ${
                  commitment.alternativeUsed
                    ? 'border-border/30 text-muted-foreground/40 cursor-not-allowed'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                }`}
              >
                {commitment.alternativeUsed ? 'ALTERNATIVE USED' : 'REQUEST ALTERNATIVE'}
              </button>
            </div>
          </>
        ) : (
          /* Accepted confirmation */
          <div className="px-6 py-8 text-center space-y-3">
            <div className="flex justify-center">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                isRecovery ? 'bg-secondary/20' : 'bg-primary/20'
              }`}>
                <Swords className={`h-6 w-6 ${isRecovery ? 'text-secondary' : 'text-primary'}`} />
              </div>
            </div>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed">
              Commitment logged at <span className="text-foreground font-semibold">{acceptTime}</span>.
              <br />
              {isRecovery
                ? 'The System appreciates your willingness. Rest well.'
                : 'The System will hold you to this.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
