

## Gap Analysis: What's Missing vs. Sung Jinwoo's System

Comparing your current implementation against the canonical System, here's what you have and what's missing:

**Already Built:** AI Intelligence Brain, Shadow Army, Dungeons, Trajectory Forecaster, Loot Drops, Level-Up Effects, Penalty System, Genetic Calibration, Quest Calibration, Persuasion Engine, Sprint Timer, Shadow Quests

**Missing (High-Impact, Achievable in ~3 credits):**

### 1. System Notification Log ("System Messages")
Jinwoo constantly sees system alerts: *"You have leveled up"*, *"New skill acquired"*, *"Shadow extracted"*, *"Penalty quest warning"*. Your app uses transient toasts that disappear. There's no persistent log of what the System has said — no history of its decisions, warnings, or acknowledgments. This is the System's "voice" made permanent.

- Create a `system_notifications` table (id, user_id, type, title, message, metadata, read, created_at)
- Types: `level_up`, `quest_complete`, `shadow_extracted`, `dungeon_cleared`, `penalty_warning`, `pattern_detected`, `streak_milestone`, `rank_up`, `loot_drop`
- Hook `useSystemNotifications` that logs events AND displays them
- A notification bell in TopBar with unread count badge
- Tapping opens a slide-out panel showing the full System log in reverse chronological order, styled like Jinwoo's blue system windows
- Wire into existing events: `addXP` (level ups), quest completion, shadow army additions, dungeon completions, streak milestones

### 2. "ARISE" Extraction Ritual
When Jinwoo defeats a powerful enemy, the iconic "ARISE" moment happens. Currently adding a Shadow is just a form. This should be a dramatic moment.

- When a dungeon is completed or a shadow is added, trigger an "ARISE" cinematic overlay (similar to existing `LevelUpOverlay` / `LootCinematicReveal` patterns)
- Full-screen dark overlay, "ARISE" text animates in with glow effect, shadow name reveals below
- Sound-like visual pulse effects (screen shake via CSS transform)
- Reuse the existing overlay pattern from `LevelUpOverlay.tsx`

### 3. Status Window (Player Card)
Jinwoo can pull up his full "Status Window" at any time — all stats, title, class, skills, equipped items. Your `PlayerProfile` exists but is basic and not accessible from the main dashboard. The Progress page has stats but doesn't feel like "the System's status window."

- Create a `StatusWindow` component that opens as a full-screen modal styled like the iconic blue holographic System UI
- Shows: Name, Title/Rank, Level, Class ("Warrior-Sprinter"), all 6 stats with bar visualization, equipped loot title, active buffs/debuffs, streak, Shadow Army count, dungeon clear count
- Triggered by tapping the Progress Ring on the dashboard (natural gesture)
- Styled with the cyan/blue glow aesthetic matching Solo Leveling's system windows

### Implementation Priority (for ~3 credits)
**Credit 1:** System Notification Log + TopBar bell — this is the biggest gap (the System needs a persistent voice)
**Credit 2:** ARISE overlay + Status Window — these are visual/cinematic and can be built together as they're primarily frontend components

### Technical Approach
- Notification log: new DB table + hook + TopBar integration + sheet/drawer panel
- ARISE: new overlay component following `LevelUpOverlay` pattern, wired into `useShadowArmy` and `useDungeons`
- Status Window: new modal component, triggered from `ProgressRing` tap, pulls from existing `usePlayer` + `useShadowArmy` + `useDungeons` hooks

