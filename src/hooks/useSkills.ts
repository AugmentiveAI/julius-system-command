import { useState, useEffect, useCallback, useMemo } from 'react';
import { Skill, SKILL_DEFINITIONS, SkillUnlockCondition } from '@/types/skills';
import { Player } from '@/types/player';

const SKILLS_STORAGE_KEY = 'systemSkills';

function loadSkills(): Skill[] {
  try {
    const stored = localStorage.getItem(SKILLS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return SKILL_DEFINITIONS.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    icon: s.icon,
    level: 0,
    maxLevel: s.maxLevel,
    unlocked: false,
    effect: s.effect,
    category: s.category,
    stat: s.stat,
  }));
}

function saveSkills(skills: Skill[]) {
  localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(skills));
}

interface SkillCheckContext {
  player: Player;
  shadowCount: number;
  dungeonClears: number;
  pillarStreak: number;
}

function checkCondition(condition: SkillUnlockCondition, ctx: SkillCheckContext): boolean {
  switch (condition.type) {
    case 'streak':
      return ctx.player.streak >= condition.threshold;
    case 'cold_streak':
      return (ctx.player.coldStreak ?? 0) >= condition.threshold;
    case 'shadow_count':
      return ctx.shadowCount >= condition.threshold;
    case 'dungeon_clears':
      return ctx.dungeonClears >= condition.threshold;
    case 'pillar_streak':
      return ctx.pillarStreak >= condition.threshold;
    case 'stat_threshold':
      return Object.values(ctx.player.stats).every(v => v >= condition.threshold);
    case 'quest_count':
      // Approximate from total XP — each quest ~25-50 XP average
      return (ctx.player.totalXP / 30) >= condition.threshold;
    default:
      return false;
  }
}

export function useSkills(ctx: SkillCheckContext) {
  const [skills, setSkills] = useState<Skill[]>(loadSkills);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Skill | null>(null);

  useEffect(() => { saveSkills(skills); }, [skills]);

  // Check for new unlocks whenever context changes
  useEffect(() => {
    setSkills(prev => {
      let changed = false;
      const updated = prev.map(skill => {
        if (skill.unlocked) return skill;
        const def = SKILL_DEFINITIONS.find(d => d.id === skill.id);
        if (!def) return skill;
        if (checkCondition(def.unlockCondition, ctx)) {
          // Only show overlay if this is a genuinely new unlock (not already saved)
          const savedSkills = loadSkills();
          const savedSkill = savedSkills.find(s => s.id === skill.id);
          if (savedSkill?.unlocked) return { ...skill, unlocked: true, level: savedSkill.level };
          
          changed = true;
          const unlocked = { ...skill, unlocked: true, level: 1, unlockedAt: new Date().toISOString() };
          setNewlyUnlocked(unlocked);
          return unlocked;
        }
        return skill;
      });
      return changed ? updated : prev;
    });
  }, [ctx.player.streak, ctx.player.coldStreak, ctx.player.stats, ctx.shadowCount, ctx.dungeonClears, ctx.pillarStreak]);

  const unlockedSkills = useMemo(() => skills.filter(s => s.unlocked), [skills]);
  const lockedSkills = useMemo(() => skills.filter(s => !s.unlocked), [skills]);

  const dismissNewSkill = useCallback(() => setNewlyUnlocked(null), []);

  return { skills, unlockedSkills, lockedSkills, newlyUnlocked, dismissNewSkill };
}
