import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, UserPlus, Compass, Circle, Minus, Moon, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Friend, UserStatus } from './CollabStudio';

interface ContactSidebarProps {
  friends: Friend[];
  selectedFriend: Friend | null;
  onSelectFriend: (friend: Friend) => void;
  myStatus: UserStatus;
  isVisible: boolean;
  onStatusChange: (status: UserStatus) => void;
  onVisibilityChange: (visible: boolean) => void;
  onOpenDiscover: () => void;
  onOpenRequests: () => void;
  requestCount: number;
  unreadCounts: Record<string, number>;
}

const statusDot: Record<UserStatus, string> = {
  online: 'bg-emerald-500',
  busy: 'bg-amber-500',
  away: 'bg-orange-400',
  dnd: 'bg-red-500',
  offline: 'bg-muted-foreground/40',
};

export function ContactSidebar({
  friends,
  selectedFriend,
  onSelectFriend,
  myStatus,
  isVisible,
  onStatusChange,
  onVisibilityChange,
  onOpenDiscover,
  onOpenRequests,
  requestCount,
  unreadCounts,
}: ContactSidebarProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return friends;
    const q = search.toLowerCase();
    return friends.filter(f =>
      (f.friend_display_name || '').toLowerCase().includes(q) ||
      f.friend_email.toLowerCase().includes(q)
    );
  }, [friends, search]);

  const online = filtered.filter(f => f.user_status === 'online' || f.user_status === 'busy');
  const offline = filtered.filter(f => f.user_status !== 'online' && f.user_status !== 'busy');

  const getInitials = (name: string | null, email: string) =>
    (name || email).substring(0, 2).toUpperCase();

  const renderRow = (friend: Friend) => {
    const isSelected = selectedFriend?.friend_user_id === friend.friend_user_id;
    const unread = unreadCounts[friend.friend_user_id] || 0;
    const name = friend.friend_display_name || friend.friend_email;

    return (
      <button
        key={friend.friend_user_id}
        onClick={() => onSelectFriend(friend)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 text-left',
          isSelected
            ? 'bg-accent text-accent-foreground'
            : 'hover:bg-accent/50'
        )}
      >
        <div className="relative flex-shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={friend.friend_avatar_url} />
            <AvatarFallback className="text-[10px] font-medium bg-muted">
              {getInitials(friend.friend_display_name, friend.friend_email)}
            </AvatarFallback>
          </Avatar>
          <span className={cn(
            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card',
            statusDot[friend.user_status || 'offline']
          )} />
        </div>
        <span className="flex-1 min-w-0 text-sm font-medium truncate">{name}</span>
        {unread > 0 && (
          <span className="flex-shrink-0 h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card/80 backdrop-blur-sm border-r border-border/50">
      {/* Search */}
      <div className="p-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search friends..."
            className="h-8 pl-8 text-xs bg-muted/50 border-transparent focus-visible:border-border"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-3 pb-2 flex gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5 justify-start"
          onClick={onOpenDiscover}
        >
          <Compass className="h-3.5 w-3.5" />
          Discover
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-8 text-xs gap-1.5 flex-1 justify-start"
          onClick={onOpenRequests}
        >
          <Bell className="h-3.5 w-3.5" />
          Requests
          {requestCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {requestCount}
            </span>
          )}
        </Button>
      </div>

      {/* Friends list */}
      <div className="flex-1 overflow-y-auto scrollbar-minimal px-2 pb-2">
        {friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <UserPlus className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No friends yet</p>
            <Button variant="link" size="sm" className="text-xs mt-1 h-auto p-0" onClick={onOpenDiscover}>
              Discover people
            </Button>
          </div>
        ) : (
          <>
            {online.length > 0 && (
              <div className="mb-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">
                  Online — {online.length}
                </p>
                {online.map(renderRow)}
              </div>
            )}
            {offline.length > 0 && (
              <div className="mb-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">
                  Offline — {offline.length}
                </p>
                {offline.map(renderRow)}
              </div>
            )}
            {filtered.length === 0 && search.trim() && (
              <p className="text-xs text-muted-foreground text-center py-4">No matches</p>
            )}
          </>
        )}
      </div>

      {/* Status bar */}
      <div className="border-t border-border/50 px-3 py-2 flex items-center gap-2">
        <Select value={myStatus} onValueChange={(v) => onStatusChange(v as UserStatus)}>
          <SelectTrigger className="h-7 w-auto min-w-[90px] text-[11px] border-transparent bg-transparent gap-1.5 px-2">
            <span className={cn('h-2 w-2 rounded-full flex-shrink-0', statusDot[myStatus])} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="online"><div className="flex items-center gap-2"><Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />Online</div></SelectItem>
            <SelectItem value="busy"><div className="flex items-center gap-2"><Minus className="h-2.5 w-2.5 text-amber-500" />Busy</div></SelectItem>
            <SelectItem value="dnd"><div className="flex items-center gap-2"><Moon className="h-2.5 w-2.5 text-red-500" />DND</div></SelectItem>
            <SelectItem value="offline"><div className="flex items-center gap-2"><Circle className="h-2.5 w-2.5 fill-muted-foreground/40 text-muted-foreground/40" />Offline</div></SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">{isVisible ? 'Visible' : 'Hidden'}</span>
          <Switch checked={isVisible} onCheckedChange={onVisibilityChange} className="scale-75 origin-right" />
        </div>
      </div>
    </div>
  );
}
