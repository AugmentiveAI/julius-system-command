import { ResearchSource, ShadowResearchConfig } from '@/types/learning';
import { ShadowCategory } from '@/types/shadowArmy';

export interface ShadowTemplate {
  id: string;
  name: string;
  category: ShadowCategory;
  description: string;
  defaultResearch: Omit<ShadowResearchConfig, 'stats'>;
  triggerConditions: {
    goalKeywords?: string[];
    userInterests?: string[];
  };
}

export const SHADOW_TEMPLATES: ShadowTemplate[] = [
  {
    id: 'business_mentor',
    name: 'Business Mentor Intel',
    category: 'skill',
    description: 'Tracks top business minds for actionable tactics',
    defaultResearch: {
      enabled: true,
      sources: [
        { type: 'youtube', target: '@AlexHormozi', active: true },
        { type: 'twitter', target: '@AlexHormozi', active: true },
        { type: 'twitter', target: '@naval', active: true },
      ],
      searchPatterns: {
        keywords: ['offer', 'pricing', 'growth', 'acquisition', 'scale'],
        topics: ['business strategy', 'marketing', 'sales'],
      },
      reporting: { frequency: 'daily', priorityThreshold: 7 },
    },
    triggerConditions: {
      goalKeywords: ['business', 'revenue', 'clients', 'MRR', 'startup'],
    },
  },
  {
    id: 'automation_scout',
    name: 'Automation Scout',
    category: 'automation',
    description: 'Finds new automation tools and techniques',
    defaultResearch: {
      enabled: true,
      sources: [
        { type: 'youtube', target: '@NickSaraev', active: true },
        { type: 'twitter', target: '@levelsio', active: true },
        { type: 'reddit', target: 'r/n8n', active: true },
      ],
      searchPatterns: {
        keywords: ['n8n', 'make', 'automation', 'AI agent', 'workflow', 'no-code'],
        topics: ['automation', 'productivity tools', 'AI'],
      },
      reporting: { frequency: 'daily', priorityThreshold: 6 },
    },
    triggerConditions: {
      goalKeywords: ['automation', 'AI', 'workflow', 'systems'],
    },
  },
  {
    id: 'cold_outreach_intel',
    name: 'Cold Outreach Intel',
    category: 'sop',
    description: "Tracks what's working in cold email and outreach",
    defaultResearch: {
      enabled: true,
      sources: [
        { type: 'reddit', target: 'r/coldoutreach', active: true },
        { type: 'reddit', target: 'r/Emailmarketing', active: true },
      ],
      searchPatterns: {
        keywords: ['cold email', 'reply rate', 'deliverability', 'subject line', 'personalization'],
        topics: ['cold outreach', 'B2B sales', 'email marketing'],
      },
      reporting: { frequency: 'weekly', priorityThreshold: 7 },
    },
    triggerConditions: {
      goalKeywords: ['outreach', 'cold email', 'sales', 'leads'],
    },
  },
  {
    id: 'fitness_optimizer',
    name: 'Fitness Optimizer',
    category: 'skill',
    description: 'Tracks fitness science and optimization',
    defaultResearch: {
      enabled: true,
      sources: [
        { type: 'youtube', target: '@hubermanlab', active: true },
        { type: 'reddit', target: 'r/fitness', active: true },
      ],
      searchPatterns: {
        keywords: ['workout', 'recovery', 'sleep', 'nutrition', 'performance'],
        topics: ['fitness', 'health optimization', 'biohacking'],
      },
      reporting: { frequency: 'weekly', priorityThreshold: 6 },
    },
    triggerConditions: {
      goalKeywords: ['fitness', 'health', 'workout', 'weight', 'muscle'],
    },
  },
  {
    id: 'content_trends',
    name: 'Content Trends',
    category: 'content',
    description: 'Tracks content trends and viral formats',
    defaultResearch: {
      enabled: true,
      sources: [
        { type: 'twitter', target: '@dickiebush', active: true },
        { type: 'twitter', target: '@JustinWelsh', active: true },
      ],
      searchPatterns: {
        keywords: ['viral', 'hook', 'content', 'LinkedIn', 'Twitter', 'engagement'],
        topics: ['content creation', 'personal branding', 'social media'],
      },
      reporting: { frequency: 'daily', priorityThreshold: 6 },
    },
    triggerConditions: {
      goalKeywords: ['content', 'social media', 'audience', 'followers', 'brand'],
    },
  },
  {
    id: 'industry_watcher',
    name: 'Industry Watcher',
    category: 'tool',
    description: 'Monitors your industry for trends and opportunities',
    defaultResearch: {
      enabled: true,
      sources: [],
      searchPatterns: { keywords: [], topics: [] },
      reporting: { frequency: 'weekly', priorityThreshold: 5 },
    },
    triggerConditions: {
      goalKeywords: ['industry', 'market', 'competitors', 'trends'],
    },
  },
];
