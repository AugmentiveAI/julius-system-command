import { formatDistanceToNow } from 'date-fns';
import { Bell, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SystemNotification, getNotificationIcon, useSystemNotifications } from '@/hooks/useSystemNotifications';

const TYPE_COLORS: Record<string, string> = {
  level_up: 'border-l-primary',
  quest_complete: 'border-l-green-500',
  shadow_extracted: 'border-l-violet-500',
  dungeon_cleared: 'border-l-amber-500',
  penalty_warning: 'border-l-destructive',
  pattern_detected: 'border-l-secondary',
  streak_milestone: 'border-l-orange-500',
  rank_up: 'border-l-yellow-400',
  loot_drop: 'border-l-emerald-400',
  info: 'border-l-muted-foreground',
};

function NotificationItem({ notification }: { notification: SystemNotification }) {
  const borderColor = TYPE_COLORS[notification.type] || TYPE_COLORS.info;
  
  return (
    <div className={`border-l-2 ${borderColor} pl-3 py-2 ${notification.read ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-2">
        <span className="text-sm mt-0.5">{getNotificationIcon(notification.type as any)}</span>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs font-bold text-foreground leading-tight">{notification.title}</p>
          <p className="font-mono text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{notification.message}</p>
          <p className="font-mono text-[9px] text-muted-foreground/50 mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
}

interface SystemNotificationPanelProps {
  notifications: SystemNotification[];
  unreadCount: number;
  onOpen: () => void;
  onClear: () => void;
}

export function SystemNotificationPanel({ notifications, unreadCount, onOpen, onClear }: SystemNotificationPanelProps) {
  return (
    <Sheet onOpenChange={(open) => { if (open) onOpen(); }}>
      <SheetTrigger asChild>
        <button
          className="relative flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          title="System Messages"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground shadow-[0_0_8px_hsl(var(--primary)/0.6)]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[320px] border-l border-primary/20 bg-background/95 backdrop-blur-xl p-0"
        style={{
          boxShadow: 'inset 1px 0 20px hsl(187 100% 50% / 0.05), 0 0 40px hsl(187 100% 50% / 0.1)',
        }}
      >
        <SheetHeader className="px-4 pt-6 pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-display text-sm tracking-widest text-primary uppercase"
              style={{ textShadow: '0 0 12px hsl(187 100% 50% / 0.4)' }}
            >
              System Log
            </SheetTitle>
            {notifications.length > 0 && (
              <button
                onClick={onClear}
                className="rounded p-1 text-muted-foreground/50 hover:text-destructive transition-colors"
                title="Clear all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="font-mono text-[9px] text-muted-foreground/60 tracking-wider">
            {notifications.length} messages · {unreadCount} unread
          </p>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="space-y-1 p-4">
            {notifications.length === 0 && (
              <p className="font-mono text-xs text-muted-foreground/40 text-center py-8">
                No system messages yet.
              </p>
            )}
            {notifications.map(n => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
