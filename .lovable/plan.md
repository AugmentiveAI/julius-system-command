

# AI-Driven Shadow Army & Dungeon Generation

## Current State
- **Shadow Army**: Fully manual — you type a name, pick a category, add it yourself
- **Dungeons**: Template-based — you unlock predefined templates when you hit level/streak thresholds, then manually create them
- **System Intelligence**: Already receives shadow army + dungeon data for analysis, but has no write-back capability

## What We'd Build

### 1. AI-Generated Shadow Recommendations
The System Intelligence edge function already analyzes your quest history, stats, and goals. We extend its output to include **shadow recommendations** — tools, automations, skills, or SOPs the AI thinks you need based on:
- Gaps in your quest completion patterns (e.g., "You keep failing systems quests → you need an n8n automation shadow")
- Your stated goal and current stat distribution
- What high-performers at your level typically have in their army

The AI returns suggested shadows with name, category, description, and reasoning. You approve or dismiss them from the dashboard.

### 2. AI-Generated Dungeon Challenges
Instead of only unlocking from a fixed template list, the System Intelligence generates **custom dungeons** calibrated to your current state:
- Dynamic objectives based on your weakest stats and recent avoidance patterns
- Difficulty scaled to your proven capability edge
- Time limits matched to your COMT/ACTN3 genetic profile (warrior-sprinter windows)
- Revenue-linked challenges when the AI detects you're avoiding sales/client work

### 3. Implementation Approach

**Edge Function Changes** (`system-intelligence/index.ts`):
- Add two new fields to the AI's tool-calling schema: `suggestedShadows[]` and `suggestedDungeons[]`
- Each shadow suggestion: `{ name, category, description, reasoning }`
- Each dungeon suggestion: `{ title, description, type, difficulty, objectives[], xpReward, timeLimit, reasoning }`

**New Type Fields** (`src/types/systemIntelligence.ts`):
- Add `SuggestedShadow` and `SuggestedDungeon` interfaces
- Extend `SystemIntelligence` with `suggestedShadows` and `suggestedDungeons` arrays

**Hook Updates** (`useSystemIntelligenceAI.ts`):
- Parse and expose the new suggestion arrays from the AI response

**UI: Suggestion Cards on Dashboard**:
- "Shadow Recruit" cards with one-tap accept → auto-creates in `shadow_army` table
- "Dungeon Gate Detected" cards with one-tap enter → auto-creates in `dungeons` table
- Both show the AI's reasoning for why it's recommending them

**Auto-Creation Option**:
- A toggle in Settings: "Allow System to auto-deploy shadows and dungeons"
- When enabled, the AI's suggestions are created automatically without approval
- When disabled (default), suggestions appear as cards you approve

### 4. Files Changed
- `supabase/functions/system-intelligence/index.ts` — extend prompt + response schema
- `src/types/systemIntelligence.ts` — add suggestion interfaces
- `src/hooks/useSystemIntelligenceAI.ts` — parse new fields
- `src/components/dashboard/SystemIntelligencePanel.tsx` — render suggestion cards
- `src/hooks/useShadowArmy.ts` — add `acceptSuggestion()` method
- `src/hooks/useDungeons.ts` — add `createFromSuggestion()` method

No database changes needed — existing `shadow_army` and `dungeons` tables already support all required fields.

