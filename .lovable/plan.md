

# Faster Mobile Touch Response

## Problem
Mobile browsers add a ~300ms delay to `click` events to distinguish taps from double-taps/scrolls. The app exclusively uses `onClick` handlers and has no CSS rules to eliminate this delay. This makes every button, checkbox, and nav link feel sluggish on mobile.

## Solution
Two targeted changes that eliminate the tap delay app-wide:

### 1. CSS: Global `touch-action: manipulation`
Add to `src/index.css` in the base layer:

```css
*, *::before, *::after {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
```

- `touch-action: manipulation` tells the browser "no double-tap-to-zoom on this element," which removes the 300ms click delay on all modern mobile browsers.
- `-webkit-tap-highlight-color: transparent` removes the gray flash on tap (iOS/Android), making interactions feel instant.

### 2. Haptic Feedback on Key Interactions
Add a small utility and use `onTouchStart` (fires instantly, no delay) for haptic vibration on the most-tapped elements:

- **Quest checkboxes** (`QuestCard.tsx`, `ProtocolQuestCard.tsx`, `CalibratedQuestCard.tsx`) -- vibrate on touch start
- **Bottom navigation** (`BottomNav.tsx`) -- vibrate on tap
- **Sprint/action buttons** (`SprintOverlay.tsx`, `FocusFAB.tsx`) -- vibrate on tap

Create a tiny helper `src/utils/haptics.ts`:
```ts
export function hapticTap() {
  if (navigator.vibrate) navigator.vibrate(10);
}
export function hapticSuccess() {
  if (navigator.vibrate) navigator.vibrate([10, 50, 20]);
}
```

Then add `onTouchStart={hapticTap}` to interactive elements so the feedback fires at touch-down (0ms delay) rather than waiting for the full click event.

## Files Changed
| File | Change |
|------|--------|
| `src/index.css` | Add global `touch-action: manipulation` and tap highlight reset |
| `src/utils/haptics.ts` | New -- tiny haptic helpers |
| `src/components/quests/QuestCard.tsx` | Add `onTouchStart={hapticTap}` to checkbox button |
| `src/components/quests/ProtocolQuestCard.tsx` | Add `onTouchStart={hapticTap}` to checkbox |
| `src/components/quests/CalibratedQuestCard.tsx` | Add `onTouchStart={hapticTap}` to checkbox |
| `src/components/navigation/BottomNav.tsx` | Add `onTouchStart={hapticTap}` to nav links |
| `src/components/focus/FocusFAB.tsx` | Add `onTouchStart={hapticTap}` |
| `src/components/quests/SprintOverlay.tsx` | Add `onTouchStart={hapticTap}` to main action buttons |

This is a minimal, non-breaking change -- no logic changes, just CSS and touch event handlers layered on top of existing `onClick` behavior.
