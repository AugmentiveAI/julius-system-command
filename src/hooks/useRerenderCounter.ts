// Dev-only rerender counter. No-op in production builds.
// Usage:
//   useRerenderCounter('JarvisPageBanner');
// Logs each time the component renders along with elapsed ms since mount.

import { useEffect, useRef } from 'react';

const ENABLED = import.meta.env.DEV;

export function useRerenderCounter(label: string): number {
  const count = useRef(0);
  const mountedAt = useRef(performance.now());

  count.current += 1;

  useEffect(() => {
    if (!ENABLED) return;
    const elapsed = Math.round(performance.now() - mountedAt.current);
    // eslint-disable-next-line no-console
    console.debug(`[rerender] ${label} #${count.current} (+${elapsed}ms)`);
  });

  return count.current;
}
