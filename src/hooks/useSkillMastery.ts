import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SkillMasteryState, MASTERABLE_SKILLS, getMasteryLevel, getNextMasteryLevel } from '@/types/skillMastery';

const LOCAL_KEY = 'systemSkillMastery';

function loadLocal(): SkillMasteryState[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function initializeSkills(): SkillMasteryState[] {
  return MASTERABLE_SKILLS.map(s => ({
    skillId: s.id,
    currentXp: 0,
    level: 1,
    maxLevel: 5,
    timesUsed: 0,
    unlockedAt: new Date().toISOString(),
  }));
}

export function useSkillMastery() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<SkillMasteryState[]>(() => {
    const loaded = loadLocal();
    return loaded.length > 0 ? loaded : initializeSkills();
  });
  const [levelUpSkill, setLevelUpSkill] = useState<{ skillId: string; newLevel: number; name: string } | null>(null);

  // Load from DB
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('skill_mastery')
        .select('*')
        .eq('user_id', user.id);

      if (data && data.length > 0) {
        const mapped: SkillMasteryState[] = data.map((row: any) => ({
          skillId: row.skill_id,
          currentXp: row.current_xp,
          level: row.level,
          maxLevel: row.max_level,
          timesUsed: row.times_used,
          lastUsedAt: row.last_used_at,
          unlockedAt: row.unlocked_at,
        }));
        // Merge with any missing skills
        const merged = MASTERABLE_SKILLS.map(s => {
          const existing = mapped.find(m => m.skillId === s.id);
          return existing || {
            skillId: s.id, currentXp: 0, level: 1, maxLevel: 5, timesUsed: 0,
            unlockedAt: new Date().toISOString(),
          };
        });
        setSkills(merged);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
      }
    })();
  }, [user]);

  // Persist locally
  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(skills));
  }, [skills]);

  // Record a quest completion and check if any skill should be incremented
  const recordQuestForMastery = useCallback((questId: string, questTitle: string) => {
    const matchingSkills = MASTERABLE_SKILLS.filter(s => {
      if (s.trackingQuestIds.includes(questId)) return true;
      const titleLower = questTitle.toLowerCase();
      return s.trackingKeywords.some(kw => titleLower.includes(kw.toLowerCase()));
    });

    if (matchingSkills.length === 0) return;

    setSkills(prev => {
      const updated = [...prev];
      for (const ms of matchingSkills) {
        const idx = updated.findIndex(s => s.skillId === ms.id);
        if (idx === -1) continue;

        const skill = { ...updated[idx] };
        skill.timesUsed += 1;
        skill.lastUsedAt = new Date().toISOString();

        // Check for level up
        const oldLevel = getMasteryLevel(skill.timesUsed - 1);
        const newLevel = getMasteryLevel(skill.timesUsed);
        if (newLevel.level > oldLevel.level && newLevel.level > skill.level) {
          skill.level = newLevel.level;
          skill.currentXp = 0;
          setLevelUpSkill({ skillId: ms.id, newLevel: newLevel.level, name: ms.name });
        }

        updated[idx] = skill;

        // Sync to DB
        if (user) {
          supabase.from('skill_mastery').upsert({
            user_id: user.id,
            skill_id: ms.id,
            current_xp: skill.currentXp,
            level: skill.level,
            max_level: skill.maxLevel,
            times_used: skill.timesUsed,
            last_used_at: skill.lastUsedAt,
          }, { onConflict: 'user_id,skill_id' }).then(() => {});
        }
      }
      return updated;
    });
  }, [user]);

  const dismissLevelUp = useCallback(() => setLevelUpSkill(null), []);

  const getSkillState = useCallback((skillId: string) => {
    return skills.find(s => s.skillId === skillId) || null;
  }, [skills]);

  const getTopSkills = useCallback((count: number = 5) => {
    return [...skills]
      .sort((a, b) => b.timesUsed - a.timesUsed)
      .slice(0, count)
      .map(s => {
        const def = MASTERABLE_SKILLS.find(ms => ms.id === s.skillId);
        return { ...s, definition: def };
      });
  }, [skills]);

  return {
    skills,
    recordQuestForMastery,
    levelUpSkill,
    dismissLevelUp,
    getSkillState,
    getTopSkills,
  };
}
