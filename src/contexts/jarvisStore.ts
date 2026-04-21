// ── JARVIS External Store ───────────────────────────────────────────
// A tiny pub/sub on top of the JarvisBrain combined value so consumers
// can subscribe to *slices* via `useSyncExternalStore` and only rerender
// when their selected slice changes (Object.is equality by default).
//
// The provider lives in JarvisBrainContext.tsx — this module only
// exposes the store factory + selector hook so it can be unit-tested
// and imported without React tree coupling.

import { useSyncExternalStore, useRef, useCallback } from 'react';

export interface JarvisStore<T> {
  get: () => T;
  set: (next: T) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createJarvisStore<T>(initial: T): JarvisStore<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (next: T) => {
      if (Object.is(next, state)) return;
      state = next;
      listeners.forEach(l => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type EqualityFn<T> = (a: T, b: T) => boolean;

/**
 * Subscribe to a derived slice of a store. The returned value is
 * referentially stable as long as `equalityFn(prev, next)` is true.
 *
 * Default equality: `Object.is`. For object slices, pass `shallowEqual`.
 */
export function useStoreSelector<S, T>(
  store: JarvisStore<S>,
  selector: (snapshot: S) => T,
  equalityFn: EqualityFn<T> = Object.is,
): T {
  // Cache the last derived value so we can return it stably on re-renders
  // where the underlying snapshot changed but the slice did not.
  const lastRef = useRef<{ snapshot: S; selected: T } | null>(null);

  const getSnapshot = useCallback(() => {
    const snapshot = store.get();
    const last = lastRef.current;
    if (last && Object.is(last.snapshot, snapshot)) {
      return last.selected;
    }
    const selected = selector(snapshot);
    if (last && equalityFn(last.selected, selected)) {
      lastRef.current = { snapshot, selected: last.selected };
      return last.selected;
    }
    lastRef.current = { snapshot, selected };
    return selected;
  }, [store, selector, equalityFn]);

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

/** Shallow equality for object slices like `{ unreadCount, hasIntervention }`. */
export function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!Object.is(a[k], b[k])) return false;
  }
  return true;
}
