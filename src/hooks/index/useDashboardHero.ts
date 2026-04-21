import { useState, useMemo } from 'react';
import { useSystemFeed } from '@/hooks/useSystemFeed';

type SystemFeedArgs = Parameters<typeof useSystemFeed>[0];

/**
 * Thin wrapper around `useSystemFeed` that also tracks dismissed feed items
 * locally — keeping that bookkeeping out of `Index.tsx`.
 *
 * Returns:
 *  - `heroItem`: highest-priority push-card the System wants the user to see
 *  - `visibleFeed`: secondary feed minus anything the user dismissed this session
 *  - `dismiss`: hide a feed item by id
 */
export function useDashboardHero(args: SystemFeedArgs) {
  const { heroItem, feedItems } = useSystemFeed(args);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleFeed = useMemo(
    () => feedItems.filter(item => !dismissedIds.has(item.id)),
    [feedItems, dismissedIds],
  );

  const heroVisible = heroItem && !dismissedIds.has(heroItem.id) ? heroItem : null;

  const dismiss = (id: string) =>
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  return { heroItem: heroVisible, visibleFeed, dismiss };
}
