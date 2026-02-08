import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { getSystemMessage } from '@/utils/systemVoice';

const SYSTEM_MESSAGES = [
  "The System is watching. Complete your daily quests to grow stronger.",
  "A hunter must be relentless. Arise.",
  "Every quest completed brings you closer to the Monarch.",
  "Pain is temporary. Glory is eternal.",
  "The weak make excuses. The strong make progress.",
  "A hunter who rests too long becomes prey.",
  "Discipline is the bridge between your current rank and Shadow Monarch.",
  "The System rewards consistency above all else.",
  "Weakness is a choice. Choose strength.",
  "The path to S-Rank is paved with daily victories.",
  "The System sees all. The System remembers all.",
  "Today's effort becomes tomorrow's power.",
  "A true hunter never stops evolving.",
  "Your potential is unlimited. Your time is not.",
  "Rise. Grind. Repeat. Ascend.",
];

function getMessageOfDay(): string {
  // Use dailyBrief voice for the rotating message
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 
    (1000 * 60 * 60 * 24)
  );
  return SYSTEM_MESSAGES[dayOfYear % SYSTEM_MESSAGES.length];
}
 
 export const SystemMessage = () => {
   const [message, setMessage] = useState('');
   const [isVisible, setIsVisible] = useState(false);
 
   useEffect(() => {
     setMessage(getMessageOfDay());
     // Animate in after mount
     const timer = setTimeout(() => setIsVisible(true), 100);
     return () => clearTimeout(timer);
   }, []);
 
   return (
     <div 
       className={`rounded-lg border border-primary/30 bg-card/80 p-4 transition-all duration-500 ${
         isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
       }`}
       style={{
         boxShadow: '0 0 20px hsl(187 100% 50% / 0.15), inset 0 0 20px hsl(187 100% 50% / 0.05)',
       }}
     >
       <div className="flex items-start gap-3">
         <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/50 bg-primary/10">
           <MessageSquare className="h-4 w-4 text-primary" />
         </div>
         <div className="flex-1">
           <p className="font-display text-xs uppercase tracking-wider text-primary/70 mb-1">
             System Message
           </p>
           <p className="font-tech text-base text-foreground italic">
             "{message}"
           </p>
         </div>
       </div>
     </div>
   );
 };