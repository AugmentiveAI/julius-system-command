import { useState } from 'react';
import { ChevronDown, Clock, Dumbbell, Brain, Moon } from 'lucide-react';
import { QuestTimeBlock, ProtocolQuest, TIME_BLOCK_CONFIG } from '@/types/quests';
import { ProtocolQuestCard } from './ProtocolQuestCard';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const TIME_BLOCK_ICONS: Record<QuestTimeBlock, React.ElementType> = {
  morning: Clock,
  midday: Dumbbell,
  afternoon: Brain,
  evening: Moon,
};

interface TimeBlockSectionProps {
  timeBlock: QuestTimeBlock;
  quests: ProtocolQuest[];
  stats: {
    completed: number;
    total: number;
    earnedXp: number;
    totalXp: number;
  };
  onToggleQuest: (questId: string) => void;
}

export const TimeBlockSection = ({
  timeBlock,
  quests,
  stats,
  onToggleQuest,
}: TimeBlockSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const config = TIME_BLOCK_CONFIG[timeBlock];
  const Icon = TIME_BLOCK_ICONS[timeBlock];
  const allComplete = stats.completed === stats.total;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}
      >
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <Icon className={`h-5 w-5 ${config.color}`} />
              <div className="text-left">
                <h3 className={`font-display text-sm font-semibold ${config.color}`}>
                  {config.label}
                </h3>
                <p className="text-xs text-muted-foreground">{config.time}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p
                  className={`font-tech text-sm ${
                    allComplete ? 'text-green-400' : 'text-foreground'
                  }`}
                >
                  {stats.completed}/{stats.total}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.earnedXp}/{stats.totalXp} XP
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            {quests.map(quest => (
              <ProtocolQuestCard
                key={quest.id}
                quest={quest}
                onToggle={onToggleQuest}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
