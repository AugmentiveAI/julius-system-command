import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type NotificationType =
  | 'level_up' | 'quest_complete' | 'shadow_extracted' | 'dungeon_cleared'
  | 'penalty_warning' | 'pattern_detected' | 'streak_milestone' | 'rank_up'
  | 'loot_drop' | 'info';

export interface SystemNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: Record<string, any>;
  read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<NotificationType, string> = {
  level_up: '⬆️',
  quest_complete: '✅',
  shadow_extracted: '👤',
  dungeon_cleared: '🏰',
  penalty_warning: '⚠️',
  pattern_detected: '🔍',
  streak_milestone: '🔥',
  rank_up: '👑',
  loot_drop: '🎁',
  info: 'ℹ️',
};

export function getNotificationIcon(type: NotificationType): string {
  return TYPE_ICONS[type] || 'ℹ️';
}

export function useSystemNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch notifications
  useEffect(() => {
    if (!user) { setNotifications([]); setLoading(false); return; }
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('system_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setNotifications((data as unknown as SystemNotification[]) || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback(async (
    type: NotificationType,
    title: string,
    message: string,
    metadata: Record<string, any> = {},
  ) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('system_notifications')
      .insert({
        user_id: user.id,
        type,
        title,
        message,
        metadata: metadata as any,
      })
      .select()
      .single();
    if (data && !error) {
      setNotifications(prev => [data as unknown as SystemNotification, ...prev]);
    }
  }, [user]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from('system_notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [user, notifications]);

  const clearAll = useCallback(async () => {
    if (!user) return;
    await supabase
      .from('system_notifications')
      .delete()
      .eq('user_id', user.id);
    setNotifications([]);
  }, [user]);

  return { notifications, unreadCount, loading, addNotification, markAllRead, clearAll };
}
