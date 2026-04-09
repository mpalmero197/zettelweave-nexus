import { useState } from 'react';
import { Bell, BellRing, Check, CheckCheck, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications, InAppNotification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    pushSupported,
    pushEnabled,
    enablePush,
    disablePush,
    markAsRead,
    markAllRead,
    clearAll,
  } = useNotifications();

  const [showSettings, setShowSettings] = useState(false);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative h-9 w-9 md:h-10 md:w-10 p-0 rounded-full border-2 border-border/50 hover:border-primary/50 hover:bg-primary/10 hover:scale-110 transition-all duration-300 touch-manipulation shadow-md hover:shadow-primary/20"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          {unreadCount > 0 ? (
            <BellRing className="h-4 w-4 text-primary animate-pulse" />
          ) : (
            <Bell className="h-4 w-4 text-primary" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 rounded-xl shadow-2xl border-border/60"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllRead}>
                <CheckCheck className="h-3 w-3" /> Read all
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="px-4 py-3 border-b border-border/40 bg-muted/30 space-y-3">
            {pushSupported && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">Get notified even when the app is closed</p>
                </div>
                <Switch
                  checked={pushEnabled}
                  onCheckedChange={(checked) => checked ? enablePush() : disablePush()}
                />
              </div>
            )}
            {!pushSupported && (
              <p className="text-xs text-muted-foreground">Push notifications are not supported in this browser.</p>
            )}
            {notifications.length > 0 && (
              <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={clearAll}>
                <Trash2 className="h-3 w-3" /> Clear all notifications
              </Button>
            )}
          </div>
        )}

        {/* Notification list */}
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1">Reminders will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onMarkRead={markAsRead} />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: InAppNotification;
  onMarkRead: (id: string) => void;
}) {
  return (
    <div
      className={`px-4 py-3 flex items-start gap-3 transition-colors hover:bg-muted/30 cursor-pointer ${
        !notification.is_read ? 'bg-primary/5' : ''
      }`}
      onClick={() => !notification.is_read && onMarkRead(notification.id)}
    >
      <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${!notification.is_read ? 'bg-primary' : 'bg-transparent'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!notification.is_read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      {!notification.is_read && (
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}>
          <Check className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
