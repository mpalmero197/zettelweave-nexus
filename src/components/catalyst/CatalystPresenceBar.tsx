import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Users } from 'lucide-react';

interface PresenceUser {
  user_id: string;
  display_name: string;
  color: string;
  online_at: string;
}

interface CatalystPresenceBarProps {
  documentId: string | null;
}

const PRESENCE_COLORS = [
  'hsl(var(--primary))',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#6366f1',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
];

export function CatalystPresenceBar({ documentId }: CatalystPresenceBarProps) {
  const { user } = useAuth();
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!documentId || !user) return;

    const channel = supabase.channel(`catalyst-doc-${documentId}`, {
      config: { presence: { key: user.id } },
    });

    const userColor = PRESENCE_COLORS[Math.floor(Math.random() * PRESENCE_COLORS.length)];

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        Object.entries(state).forEach(([key, value]) => {
          if (key !== user.id && Array.isArray(value) && value.length > 0) {
            const v = value[0] as any;
            users.push({
              user_id: key,
              display_name: v.display_name || 'Anonymous',
              color: v.color || '#888',
              online_at: v.online_at || new Date().toISOString(),
            });
          }
        });
        setPresenceUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Fetch display name
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', user.id)
            .single();

          await channel.track({
            display_name: profile?.display_name || user.email?.split('@')[0] || 'Anonymous',
            color: userColor,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId, user]);

  if (!documentId || presenceUsers.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex -space-x-1.5">
          {presenceUsers.map((u) => (
            <Tooltip key={u.user_id}>
              <TooltipTrigger asChild>
                <Avatar className="h-6 w-6 border-2 border-background ring-1" style={{ borderColor: u.color }}>
                  <AvatarFallback className="text-[10px]" style={{ backgroundColor: u.color + '20', color: u.color }}>
                    {u.display_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{u.display_name} — editing</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
          {presenceUsers.length + 1} online
        </Badge>
      </div>
    </TooltipProvider>
  );
}
