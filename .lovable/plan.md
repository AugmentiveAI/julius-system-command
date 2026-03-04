

# Phase 1: Supabase Backend + Authentication

## Current State
The app has **39 files with ~721 localStorage references** — every piece of data (player stats, quests, inventory, sprint timers, genetic state, resistance tracking, history, etc.) lives entirely in the browser. No Supabase connection exists yet.

Migrating everything at once would be a multi-day effort and risk breaking the app. Instead, we'll build the foundation first, then migrate data layer-by-layer.

## Build Order (Phase 1, broken into steps)

### Step 1: Connect Lovable Cloud + Set Up Database Schema
- Enable Lovable Cloud (Supabase) on this project
- Create core tables:

```text
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  profiles    │    │  player_state    │    │  user_roles     │
│─────────────│    │──────────────────│    │─────────────────│
│ id (FK auth)│───▶│ user_id (FK)     │    │ user_id (FK)    │
│ display_name│    │ stats (jsonb)    │    │ role (enum)     │
│ title/rank  │    │ level, xp        │    └─────────────────┘
│ goal        │    │ streak, cold_str │
│ created_at  │    │ penalty (jsonb)  │
└─────────────┘    │ updated_at       │
                   └──────────────────┘

┌──────────────────┐    ┌──────────────────┐
│  quest_history   │    │  inventory       │
│──────────────────│    │──────────────────│
│ user_id (FK)     │    │ user_id (FK)     │
│ quest_id         │    │ data (jsonb)     │
│ quest_title      │    │ updated_at       │
│ xp_earned        │    └──────────────────┘
│ completed_at     │
│ type, category   │
└──────────────────┘
```

- Enable RLS on all tables with user-scoped policies
- Create auto-profile trigger on signup

### Step 2: Authentication UI
- Build a login/signup page (`/auth`) with email + password
- Add auth state provider wrapping the app
- Protected routes: redirect unauthenticated users to `/auth`
- The onboarding (Awakening Sequence) triggers after first signup instead of checking localStorage

### Step 3: Migrate Player State to Supabase
- Create a `usePlayerSync` hook that:
  - On login: loads player data from Supabase → falls back to localStorage → seeds new profile
  - On state change: debounced write to Supabase (keeps localStorage as offline cache)
  - On logout: clears local state
- This replaces the raw localStorage reads/writes in `usePlayer.ts` with a sync layer
- All existing hooks continue working — they just read/write through the sync layer

### Step 4: Migrate Quest History + Inventory
- Quest completions write to `quest_history` table on completion
- Inventory syncs via the same debounce pattern
- History page reads from Supabase instead of localStorage context

### Step 5: One-Time Data Migration Flow
- On first authenticated login, detect existing localStorage data
- Prompt: "The System has detected local progress. Merge with your account?"
- Upload localStorage data to Supabase tables, then clear local keys

## What This Unlocks
- Cross-device sync (phone, laptop, tablet — same account)
- Data survives cache clears and device changes
- Foundation for multi-user (Phase 2 of the roadmap)
- Foundation for server-side AI features (edge functions accessing user data)

## What Stays the Same
- All UI components unchanged
- All game logic unchanged (XP, penalties, genetic engine, etc.)
- Sprint timers and daily state still cache locally for instant response, sync in background

## Estimated Scope
This is the largest single phase. We'll build it step-by-step across multiple messages, starting with Cloud setup and schema creation.

