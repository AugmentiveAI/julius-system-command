

## Phase 1 Progress Check

### Completed
| Step | Status |
|------|--------|
| **Step 1**: Database schema + RLS + auto-profile trigger | Done |
| **Step 2**: Auth UI, AuthProvider, protected routes | Done |
| **Step 3**: `usePlayerSync` — load from DB, debounced writes, localStorage cache | Done |
| **Step 4**: `useHistorySync` + `useInventorySync` — quest history & inventory sync | Done |
| **Step 5**: One-time localStorage migration dialog | Done |
| **XP gap fix**: Protocol quest completions now call `addXP` | Done |

### Outstanding Items from the Original Plan

**1. Onboarding still checks localStorage instead of the database (Step 2, bullet 4)**
The plan states: *"The onboarding (Awakening Sequence) triggers after first signup instead of checking localStorage."* Currently `isFirstRun` reads from `localStorage`, so the awakening sequence will replay on a new device even if the user already has a cloud profile. Fix: query the `player_state` table on login — if a row exists with `total_xp > 0`, skip onboarding.

**2. Sign-out doesn't clear local state (Step 3, bullet 3)**
The plan states the sync hook should *"On logout: clear local state."* Currently `usePlayerSync` doesn't listen for sign-out events. When a user logs out, stale localStorage data persists and could leak into the next session. Fix: listen for `SIGNED_OUT` in `AuthContext` or the sync hooks and clear relevant localStorage keys.

**3. History page still reads from localStorage context**
Step 4 says *"History page reads from Supabase instead of localStorage context."* `useHistorySync` writes completions to the DB, but the `HistoryContext` / history page still loads its display data from localStorage. The page won't show history on a new device. Fix: have the history context load from the `quest_history` table when authenticated.

### Summary
Three gaps remain — all are data-flow fixes, no new tables or schema changes needed. They can be addressed in one implementation pass.

