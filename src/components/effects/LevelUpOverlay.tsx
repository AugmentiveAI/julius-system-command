import { useEffect, useState } from 'react';
import { getSystemMessage } from '@/utils/systemVoice';

interface LevelUpOverlayProps {
  show: boolean;
  newLevel: number;
}
 
 export const LevelUpOverlay = ({ show, newLevel }: LevelUpOverlayProps) => {
   const [visible, setVisible] = useState(false);
   const [animateLevel, setAnimateLevel] = useState(false);
 
   useEffect(() => {
     if (show) {
       setVisible(true);
       // Trigger level number animation after flash
       const animTimer = setTimeout(() => setAnimateLevel(true), 200);
       // Hide everything after animation completes
       const hideTimer = setTimeout(() => {
         setVisible(false);
         setAnimateLevel(false);
       }, 1500);
       
       return () => {
         clearTimeout(animTimer);
         clearTimeout(hideTimer);
       };
     }
   }, [show]);
 
   if (!visible) return null;
 
   return (
     <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
       {/* Background flash */}
       <div
         className="absolute inset-0 bg-primary/30"
         style={{
           animation: 'level-flash 0.5s ease-out forwards',
         }}
       />
       
       {/* Level number animation */}
       <div 
         className={`relative z-10 text-center transition-all duration-500 ${
           animateLevel 
             ? 'opacity-100 scale-100' 
             : 'opacity-0 scale-50'
         }`}
       >
          <p className="font-display text-xl uppercase tracking-widest text-primary mb-2">
            {getSystemMessage('levelUp', { level: newLevel })}
          </p>
         <p 
           className="font-display text-8xl font-bold text-primary"
           style={{
             textShadow: '0 0 40px hsl(187 100% 50% / 0.8), 0 0 80px hsl(187 100% 50% / 0.5)',
           }}
         >
           {newLevel}
         </p>
       </div>
 
       <style>
         {`
           @keyframes level-flash {
             0% { opacity: 0; }
             20% { opacity: 1; }
             100% { opacity: 0; }
           }
         `}
       </style>
     </div>
   );
 };