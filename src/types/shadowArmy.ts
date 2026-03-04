export type ShadowCategory = 'automation' | 'client' | 'content' | 'sop' | 'skill' | 'tool';
export type ShadowStatus = 'active' | 'dormant' | 'evolving';

export interface Shadow {
  id: string;
  user_id: string;
  name: string;
  category: ShadowCategory;
  description: string | null;
  power_level: number;
  contribution_score: number;
  status: ShadowStatus;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export const SHADOW_CATEGORIES: { value: ShadowCategory; label: string; icon: string; description: string }[] = [
  { value: 'automation', label: 'Automation', icon: '⚙️', description: 'n8n flows, AI agents, scheduled scripts' },
  { value: 'client', label: 'Client', icon: '🤝', description: 'Active client relationships generating revenue' },
  { value: 'content', label: 'Content', icon: '📝', description: 'Articles, videos, templates that work for you' },
  { value: 'sop', label: 'SOP', icon: '📋', description: 'Standard operating procedures, playbooks' },
  { value: 'skill', label: 'Skill', icon: '🧠', description: 'Capabilities that compound over time' },
  { value: 'tool', label: 'Tool', icon: '🔧', description: 'Software, systems, infrastructure' },
];

export function getCategoryIcon(category: ShadowCategory): string {
  return SHADOW_CATEGORIES.find(c => c.value === category)?.icon || '👤';
}

export function getTotalArmyPower(shadows: Shadow[]): number {
  return shadows
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.power_level, 0);
}

export function getForceMultiplier(shadows: Shadow[]): number {
  const active = shadows.filter(s => s.status === 'active');
  if (active.length === 0) return 1;
  const totalContribution = active.reduce((sum, s) => sum + s.contribution_score, 0);
  return 1 + (totalContribution / 100);
}
