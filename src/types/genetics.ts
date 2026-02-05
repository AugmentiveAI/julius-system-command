 export interface GeneticTrait {
   id: string;
   name: string;
   gene: string;
   variant: string;
   type: 'buff' | 'debuff';
   category: 'cognitive' | 'physical' | 'recovery' | 'metabolic';
   icon: string;
   effect: string;
   optimization: string;
 }
 
 export interface GeneticProfile {
   archetype: string;
   traits: GeneticTrait[];
 }
 
 export const JULIUS_GENETICS: GeneticProfile = {
   archetype: "Warrior-Sprinter",
   traits: [
     {
       id: 'comt-warrior',
       name: "Warrior's Focus",
       gene: 'COMT',
       variant: 'Val/Val',
       type: 'buff',
       category: 'cognitive',
       icon: '⚔️',
       effect: '+15% cognitive performance under pressure',
       optimization: 'Use time pressure and stakes to activate focus'
     },
     {
       id: 'actn3-sprinter',
       name: "Sprinter Gene",
       gene: 'ACTN3',
       variant: 'CC',
       type: 'buff',
       category: 'physical',
       icon: '💨',
       effect: 'Built for explosive power, not endurance',
       optimization: '45-min work sprints, HIIT over steady-state'
     },
     {
       id: 'bdnf-normal',
       name: "Rapid Adaptation",
       gene: 'BDNF',
       variant: 'Val/Val',
       type: 'buff',
       category: 'recovery',
       icon: '🧠',
       effect: 'Exercise immediately boosts learning capacity',
       optimization: 'Schedule learning 2-4hr post-workout'
     },
     {
       id: 'cyp1a2-slow',
       name: "Slow Caffeine",
       gene: 'CYP1A2',
       variant: 'Slow',
       type: 'debuff',
       category: 'metabolic',
       icon: '☕',
       effect: 'Caffeine half-life 6-9 hours',
       optimization: 'Hard cutoff at 10:00 AM'
     },
     {
       id: 'apoe-e4',
       name: "Brain Protection Required",
       gene: 'APOE',
       variant: 'e4 carrier',
       type: 'debuff',
       category: 'recovery',
       icon: '🛡️',
       effect: 'Requires proactive neuroprotection',
       optimization: 'Sleep 7-8hr, exercise, Omega-3, meditation'
     },
     {
       id: 'comt-paralysis',
       name: "Analysis Paralysis",
       gene: 'COMT',
       variant: 'Val/Val',
       type: 'debuff',
       category: 'cognitive',
       icon: '🔄',
       effect: 'Risk of perfectionism without deadlines',
       optimization: 'Set hard deadlines, ship before perfect'
     }
   ]
 };