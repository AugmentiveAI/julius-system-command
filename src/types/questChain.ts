import { PlayerStats } from './player';

export interface QuestChainStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  dayTarget?: number; // which day of the chain this step targets (1-indexed)
}

export type ChainStatus = 'active' | 'completed' | 'failed' | 'expired';
export type ChainType = 'narrative' | 'revenue' | 'skill' | 'network' | 'creative';

export interface QuestChain {
  id: string;
  userId: string;
  title: string;
  description: string;
  chainType: ChainType;
  steps: QuestChainStep[];
  currentStep: number;
  totalSteps: number;
  status: ChainStatus;
  xpPerStep: number;
  bonusXp: number; // completion bonus for finishing entire chain
  stat: keyof PlayerStats;
  startedAt: string;
  completedAt?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

// Pre-built chain templates the System can assign
export const CHAIN_TEMPLATES: Array<{
  title: string;
  description: string;
  chainType: ChainType;
  stat: keyof PlayerStats;
  xpPerStep: number;
  bonusXp: number;
  steps: Array<{ title: string; description: string }>;
}> = [
  {
    title: 'Close First $1K Deal',
    description: 'A structured campaign to land your first paying client. Each step builds momentum toward revenue.',
    chainType: 'revenue',
    stat: 'sales',
    xpPerStep: 75,
    bonusXp: 250,
    steps: [
      { title: 'Identify 10 prospects', description: 'Research and list 10 potential clients who need your services.' },
      { title: 'Craft personalized outreach', description: 'Write tailored messages for your top 5 prospects.' },
      { title: 'Send outreach & follow up', description: 'Send all messages. Follow up within 48 hours on non-responses.' },
      { title: 'Book discovery call', description: 'Schedule at least one discovery or intro call.' },
      { title: 'Close the deal', description: 'Present your offer and close. Any revenue counts.' },
    ],
  },
  {
    title: 'Build a Content Engine',
    description: 'Go from zero to a repeatable content production system in 5 days.',
    chainType: 'creative',
    stat: 'creative',
    xpPerStep: 60,
    bonusXp: 200,
    steps: [
      { title: 'Define content pillars', description: 'Choose 3 content themes that align with your expertise and audience.' },
      { title: 'Create a content template', description: 'Build a reusable template or format for your primary content type.' },
      { title: 'Produce 3 pieces of content', description: 'Use the template to create 3 pieces in one sitting.' },
      { title: 'Schedule & publish', description: 'Set up scheduling and publish all 3 pieces across platforms.' },
      { title: 'Analyze & iterate', description: 'Review engagement data. Document what worked for the next cycle.' },
    ],
  },
  {
    title: 'Automate a Core Workflow',
    description: 'Identify and fully automate one time-consuming process to free up capacity.',
    chainType: 'skill',
    stat: 'systems',
    xpPerStep: 65,
    bonusXp: 225,
    steps: [
      { title: 'Audit time usage', description: 'Track your tasks for one day. Identify the most repetitive process.' },
      { title: 'Map the workflow', description: 'Document every step of the process you want to automate.' },
      { title: 'Build the automation', description: 'Use Zapier, Make, or code to automate the workflow.' },
      { title: 'Test & refine', description: 'Run the automation 3 times. Fix any issues.' },
      { title: 'Deploy & document', description: 'Make it live. Write an SOP so it runs without you.' },
    ],
  },
  {
    title: 'Expand Your Network',
    description: 'Strategic relationship building over 5 days to unlock new opportunities.',
    chainType: 'network',
    stat: 'network',
    xpPerStep: 55,
    bonusXp: 175,
    steps: [
      { title: 'Identify 5 key connectors', description: 'List 5 people who could open doors in your industry.' },
      { title: 'Engage authentically', description: 'Comment meaningfully on their content or reach out with value.' },
      { title: 'Offer value first', description: 'Share a resource, intro, or insight with at least 2 of them.' },
      { title: 'Request a conversation', description: 'Ask for a brief call or coffee chat with at least 1.' },
      { title: 'Follow up & nurture', description: 'Send a follow-up. Add them to your regular engagement list.' },
    ],
  },
  {
    title: 'Financial Clarity Sprint',
    description: 'Get complete visibility into your financial position and create a 90-day revenue plan.',
    chainType: 'revenue',
    stat: 'wealth',
    xpPerStep: 70,
    bonusXp: 200,
    steps: [
      { title: 'Audit all income streams', description: 'Document every source of revenue, active and passive.' },
      { title: 'Calculate monthly burn rate', description: 'Track all expenses. Know your exact runway.' },
      { title: 'Set 90-day revenue target', description: 'Based on expenses and goals, set a specific revenue target.' },
      { title: 'Build revenue pipeline', description: 'Map out exactly how you will hit the target (clients, products, services).' },
      { title: 'Create weekly revenue tracker', description: 'Set up a simple tracker to monitor progress weekly.' },
    ],
  },
  {
    title: 'Deep Skill Acquisition',
    description: 'Deliberately practice one high-value skill for 5 days straight.',
    chainType: 'skill',
    stat: 'systems',
    xpPerStep: 60,
    bonusXp: 200,
    steps: [
      { title: 'Choose your target skill', description: 'Pick one skill that would 10x your output if mastered.' },
      { title: 'Find optimal learning resources', description: 'Curate the best 2-3 resources (course, book, mentor).' },
      { title: 'Complete Day 1 deep practice', description: '45-minute focused practice session with deliberate repetition.' },
      { title: 'Complete Day 2-3 practice', description: 'Two more focused practice sessions. Apply skill to a real project.' },
      { title: 'Teach or demonstrate', description: 'Explain what you learned to someone or create a summary. Teaching cements knowledge.' },
    ],
  },
];
