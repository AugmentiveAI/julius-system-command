

# Penalty Dungeon System

## Overview
When a player has 2+ consecutive zero-completion days, a mandatory "Penalty Dungeon" automatically spawns. It's a timed quest with a threatening UI — complete it or suffer permanent stat reduction. This mirrors Jinwoo's brutal penalty quests that are unavoidable and terrifying.

## How It Works

1. **Trigger**: On day transition, if `player.penalty.consecutiveZeroDays >= 2`, a penalty dungeon auto-creates in the database with `dungeon_type: 'penalty'` and a 4-hour time limit.
2. **Blocking UI**: A full-screen `PenaltyDungeonOverlay` appears that cannot be dismissed. It shows a countdown timer, the penalty quest objectives, and the stat that will be reduced on failure. The overlay pulses red/black with a "PENALTY QUEST" header.
3. **Completion**: Player checks off 3 simple but mandatory objectives (e.g., "Complete 2 quests within 4 hours", "Log a cold exposure or training session", "Complete a 30-minute sprint"). Completing all objectives clears the penalty dungeon and resets `consecutiveZeroDays`.
4. **Failure**: If the timer expires or the player doesn't complete all objectives, the lowest stat is permanently reduced by 3 points and a system notification is logged. The overlay shows a "PENALTY APPLIED" cinematic before closing.

## Technical Plan

### 1. Extend Dungeon Types
- Add `'penalty'` to `DungeonType` in `src/types/dungeon.ts`
- Add a `PENALTY_DUNGEON_TEMPLATE` constant with 3 objectives and 240-minute time limit

### 2. Create `usePenaltyDungeon` Hook (`src/hooks/usePenaltyDungeon.ts`)
- Checks `player.penalty.consecutiveZeroDays >= 2` on mount and visibility changes
- Queries dungeons table for any active/available penalty dungeon for today
- If none exists and penalty threshold met, auto-creates one via Supabase insert
- Exposes: `activePenalty`, `completeObjective`, `timeRemaining`, `isExpired`, `isPenaltyActive`
- On expiry: calls a callback to apply stat reduction and log notification

### 3. Create `PenaltyDungeonOverlay` Component (`src/components/effects/PenaltyDungeonOverlay.tsx`)
- Full-screen overlay with `z-[100]` (above everything)
- Red/black pulsing background with "PENALTY QUEST" title
- Countdown timer (hours:minutes:seconds)
- 3 objective checkboxes
- Shows which stat will be reduced on failure
- Cannot be dismissed — only completing all objectives or timer expiry closes it
- On failure: shows a brief "PENALTY APPLIED" screen with stat reduction amount before fading

### 4. Wire into `Index.tsx`
- Import `usePenaltyDungeon` with player penalty state
- Render `PenaltyDungeonOverlay` when `isPenaltyActive` is true
- On completion: add XP, log notification ("Penalty Quest Survived"), reset penalty state
- On failure: reduce lowest stat by 3, log notification ("Penalty Applied — stat reduced"), flash overlay

### 5. Connect to Existing Systems
- When penalty objectives include "complete a quest", listen to `useProtocolQuests` completions
- When objectives include "complete training", listen to `useWorkout` completion
- Auto-mark penalty objectives as the player completes real quests during the penalty window

## Files Changed
- `src/types/dungeon.ts` — add `'penalty'` type + template
- `src/hooks/usePenaltyDungeon.ts` — new hook
- `src/components/effects/PenaltyDungeonOverlay.tsx` — new overlay component
- `src/pages/Index.tsx` — wire penalty dungeon into dashboard

No database migration needed — the existing `dungeons` table already supports custom types, objectives, and time limits.

