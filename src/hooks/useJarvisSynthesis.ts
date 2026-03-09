import { useState, useEffect, useCallback } from 'react';
import { SynthesizedInsight, ResearchFinding, UserLearning } from '@/types/learning';

const STORAGE_KEY = 'jarvisSynthesizedInsights';

function generateId(): string {
  return `synth-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

function findConnectionToUser(
  finding: ResearchFinding,
  learning: UserLearning | null,
): SynthesizedInsight | null {
  if (!learning) return null;

  const insightsLower = finding.content.keyInsights.map(i => i.toLowerCase());
  const summaryLower = finding.content.summary.toLowerCase();

  // Connect productivity findings to avoidance patterns
  if (insightsLower.some(i => i.includes('productivity') || i.includes('execution'))) {
    if (learning.avoidance.avoidedCategories.length > 0) {
      return {
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: 'opportunity',
        headline: `${finding.content.title} — connects to your avoidance pattern`,
        detail: `You tend to avoid ${learning.avoidance.avoidedCategories.join(', ')}. This finding might help: ${finding.content.summary}`,
        sources: { shadowFinding: finding, userPattern: 'avoidance' },
        suggestedAction: {
          type: 'research',
          description: `Review and apply: ${finding.content.title}`,
          priority: 'medium',
        },
        priority: finding.content.relevanceScore,
        delivered: false,
      };
    }
  }

  // Connect pricing/offer findings to revenue goals
  if (insightsLower.some(i => i.includes('pricing') || i.includes('offer') || i.includes('revenue'))) {
    return {
      id: generateId(),
      timestamp: new Date().toISOString(),
      type: 'opportunity',
      headline: `Pricing insight: ${finding.content.title}`,
      detail: finding.content.summary,
      sources: { shadowFinding: finding, goalConnection: 'MRR/Revenue' },
      suggestedAction: {
        type: 'decision',
        description: 'Review and consider applying to your offer',
        priority: 'high',
      },
      priority: finding.content.relevanceScore,
      delivered: false,
    };
  }

  // Connect outreach findings
  if (summaryLower.includes('cold email') || summaryLower.includes('outreach')) {
    return {
      id: generateId(),
      timestamp: new Date().toISOString(),
      type: 'opportunity',
      headline: `Outreach tactic: ${finding.content.title}`,
      detail: finding.content.summary,
      sources: { shadowFinding: finding, userPattern: 'outreach' },
      suggestedAction: {
        type: 'quest',
        description: 'Test this approach in your next outreach batch',
        priority: 'medium',
      },
      priority: finding.content.relevanceScore,
      delivered: false,
    };
  }

  return null;
}

function generatePatternInsights(learning: UserLearning): SynthesizedInsight[] {
  const insights: SynthesizedInsight[] = [];
  const hour = new Date().getHours();
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // Peak time notification
  if (learning.execution.peakHours.includes(hour) && learning.execution.peakDays.includes(day)) {
    const rate = learning.execution.completionRateByHour[hour];
    insights.push({
      id: generateId(),
      timestamp: new Date().toISOString(),
      type: 'recommendation',
      headline: 'Peak performance window active',
      detail: `This is your most productive time. Historical completion rate: ${Math.round((rate || 0) * 100)}%. Execute your highest-priority task now.`,
      sources: { userPattern: 'peak_hours' },
      suggestedAction: {
        type: 'quest',
        description: 'Start your top priority quest',
        priority: 'high',
      },
      priority: 9,
      delivered: false,
    });
  }

  // Crash time warning
  if (learning.energy.crashHours.includes(hour)) {
    insights.push({
      id: generateId(),
      timestamp: new Date().toISOString(),
      type: 'warning',
      headline: 'Energy crash window',
      detail: 'Your data shows lower energy at this time. Consider lighter tasks or a short break.',
      sources: { userPattern: 'crash_hours' },
      suggestedAction: {
        type: 'habit',
        description: 'Take a 15-min walk or switch to admin tasks',
        priority: 'low',
      },
      priority: 5,
      delivered: false,
    });
  }

  // Avoidance pattern alert
  if (learning.avoidance.avoidedCategories.length > 0) {
    const avoided = learning.avoidance.avoidedCategories[0];
    insights.push({
      id: generateId(),
      timestamp: new Date().toISOString(),
      type: 'warning',
      headline: `${avoided} tasks need attention`,
      detail: `You consistently avoid ${avoided} tasks. Consider scheduling one during your peak hours to break the pattern.`,
      sources: { userPattern: 'avoidance' },
      suggestedAction: {
        type: 'quest',
        description: `Complete one ${avoided} task today`,
        priority: 'medium',
      },
      priority: 7,
      delivered: false,
    });
  }

  return insights;
}

export function useJarvisSynthesis(
  learning: UserLearning | null,
  unreadFindings: ResearchFinding[],
) {
  const [insights, setInsights] = useState<SynthesizedInsight[]>([]);

  // Load stored insights
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setInsights(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Save on change
  useEffect(() => {
    if (insights.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(insights));
    }
  }, [insights]);

  const synthesize = useCallback(() => {
    const newInsights: SynthesizedInsight[] = [];

    // 1. Connect shadow findings to user patterns
    for (const finding of unreadFindings) {
      const connection = findConnectionToUser(finding, learning);
      if (connection) newInsights.push(connection);
    }

    // 2. Generate pattern-based insights
    if (learning) {
      const patternInsights = generatePatternInsights(learning);
      newInsights.push(...patternInsights);
    }

    // Sort by priority and merge
    const sorted = newInsights.sort((a, b) => b.priority - a.priority);
    setInsights(prev => [...sorted, ...prev].slice(0, 50));

    return sorted;
  }, [learning, unreadFindings]);

  const getTopInsight = useCallback((): SynthesizedInsight | null => {
    return insights.find(i => !i.delivered) || null;
  }, [insights]);

  const markDelivered = useCallback((insightId: string) => {
    setInsights(prev =>
      prev.map(i =>
        i.id === insightId ? { ...i, delivered: true, deliveredAt: new Date().toISOString() } : i
      )
    );
  }, []);

  const markActedOn = useCallback((insightId: string) => {
    setInsights(prev =>
      prev.map(i => (i.id === insightId ? { ...i, actedOn: true } : i))
    );
  }, []);

  return {
    insights,
    synthesize,
    getTopInsight,
    markDelivered,
    markActedOn,
    getUndeliveredCount: () => insights.filter(i => !i.delivered).length,
  };
}
