import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';

type TickerCallback = () => void;

interface TickerContextValue {
  subscribe: (cb: TickerCallback) => () => void;
}

const TickerContext = createContext<TickerContextValue | null>(null);

const TICK_INTERVAL = 60_000;

export function TickerProvider({ children }: { children: React.ReactNode }) {
  const subscribersRef = useRef(new Set<TickerCallback>());

  useEffect(() => {
    const tick = () => {
      subscribersRef.current.forEach(cb => {
        try { cb(); } catch (e) { console.error('[Ticker] callback error:', e); }
      });
    };

    const interval = setInterval(tick, TICK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const subscribe = useCallback((cb: TickerCallback) => {
    subscribersRef.current.add(cb);
    return () => { subscribersRef.current.delete(cb); };
  }, []);

  return (
    <TickerContext.Provider value={{ subscribe }}>
      {children}
    </TickerContext.Provider>
  );
}

/**
 * Register a callback to run on every 60-second tick.
 * Replaces individual setInterval(fn, 60000) calls.
 * The callback also runs immediately on mount.
 */
export function useTickerEffect(callback: TickerCallback, deps: React.DependencyList) {
  const ctx = useContext(TickerContext);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback, ...deps]);

  useEffect(() => {
    // Run immediately on mount
    callbackRef.current();

    if (!ctx) {
      // Fallback if not wrapped in TickerProvider
      const interval = setInterval(() => callbackRef.current(), TICK_INTERVAL);
      return () => clearInterval(interval);
    }

    return ctx.subscribe(() => callbackRef.current());
  }, [ctx]);
}
