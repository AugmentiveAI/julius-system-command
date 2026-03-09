

# Phase 1: Threat Assessment System

## Overview

Build a dedicated Threat Assessment engine that runs alongside the existing intervention system, providing a persistent threat-level indicator on the dashboard. Threats are distinct from interventions — they represent ongoing risk states rather than one-time nudges.

## Architecture

```text
threatEngine.ts          ← Pure logic: threat rules + evaluation
  ↓
useThreatAssessment.ts   ← Hook: gathers context, runs engine every 60s
  ↓
ThreatIndicator.tsx      ← TopBar component: color-coded dot + expandable list
  ↓
JarvisBrainContext.tsx   ← Exposes threats to system chat + intelligence
  ↓
system-chat/index.ts     ← Receives threats in playerContext
system-intelligence/     ← Receives threats in player data
```

## Files to Create

### 1. `src/types/threat.ts`
- `ThreatCategory`: streak, fatigue, pipeline, genetic, momentum, stat_decay, deadline, penalty
- `ThreatLevel`: nominal, elevated, high, critical
- `Threat` interface: id, category, level, title, description, metric, recommendation, detectedAt, expiresAt
- `ThreatAssessment` interface: overallLevel, threats[], lastUpdated
- `ThreatContext` interface: extends existing InterventionContext with additional fields (consecutiveZeroDays, penaltyDungeonActive, penaltyTimeRemaining, daysSinceLastOutreach, questsCompletedLast3Days, daysToExitDeadline, currentMRR, targetMRR, deepWorkCompletedToday, attemptingHighCognitionTask)

### 2. `src/utils/threatEngine.ts`
- Threat rules as defined in the prompt (streak_warning, streak_critical, fatigue_elevated, fatigue_high, pipeline_warning, pipeline_critical, genetic_crash_active, genetic_peak_wasted, momentum_stall, penalty_imminent, penalty_active, deadline_approaching)
- `evaluateThreats(ctx: ThreatContext): Threat[]` — runs all rules, returns active threats
- `getOverallLevel(threats: Threat[]): ThreatLevel` — returns highest level
- Level priority: critical > high > elevated > nominal

### 3. `src/hooks/useThreatAssessment.ts`
- Gathers context from usePlayer, useProtocolQuests, useTrainingLog, useGeneticState, usePenaltyDungeon
- Reads localStorage for quest history (last 3 days completions), pipeline data
- Runs `evaluateThreats` every 60 seconds
- Returns: assessment, overallLevel, threats, hasCriticalThreat, hasAnyThreat, getThreatsByCategory

### 4. `src/components/dashboard/ThreatIndicator.tsx`
- Popover-based component (matches existing TopBar pattern with Popover)
- Button shows: color-coded dot (green/yellow/orange/red) + "NOMINAL"/"ELEVATED"/"HIGH"/"CRITICAL" label
- Dot pulses: none for nominal, slow for elevated, medium for high, fast for critical with glow
- Popover content: lists all active threats with category icon, title, metric, recommendation
- Empty state when nominal: "All systems nominal."

## Files to Modify

### 5. `src/components/dashboard/TopBar.tsx`
- Import and render `<ThreatIndicator />` in the right-side controls, before the notification panel

### 6. `src/contexts/JarvisBrainContext.tsx`
- Add `useThreatAssessment` to the provider
- Expose `threats`, `overallThreatLevel`, `hasCriticalThreat` on the context
- Build threat context using the same shared state already gathered

### 7. `src/hooks/useSystemChat.ts`
- Extend `PlayerContext` interface to include `threats` object (overall level + active threat summaries)
- Pass threat data into `buildContext()` calls

### 8. `src/components/chat/SystemChatPanel.tsx`
- Update the context builder to include threats from JarvisBrain

### 9. `supabase/functions/system-chat/index.ts`
- Add threats to the context injection section of the system prompt so JARVIS references active threats

### 10. `supabase/functions/system-intelligence/index.ts`
- Add threat assessment data to the player data payload sent to the AI
- Include threatAssessment in the expected output schema

### 11. `src/types/systemIntelligence.ts`
- Add `threatAssessment` optional field to `SystemIntelligence` interface

## Key Design Decisions

- Threats run client-side (like interventions) for instant feedback — no edge function needed for evaluation
- Some context fields (daysSinceLastOutreach, MRR targets) will initially default to safe values since pipeline/revenue tracking isn't fully built yet — the rules simply won't trigger until that data exists
- Threats are NOT dismissible (unlike interventions) — they persist as long as the condition is true
- The threat indicator replaces the mode dot's position or sits adjacent to it in the TopBar

