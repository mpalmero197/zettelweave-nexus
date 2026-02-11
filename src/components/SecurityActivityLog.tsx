import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, LogIn, Key, Download, AlertTriangle, RefreshCw, Monitor, Mail, ShieldOff, ShieldCheck, UserX, UserCog, Lock, Unlock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface AuditEvent {
  id: string;
  event_type: string;
  created_at: string;
  event_details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
}

const eventConfig: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  login: { label: 'Sign In', icon: LogIn, color: 'bg-emerald-500/10 text-emerald-500' },
  logout: { label: 'Sign Out', icon: LogIn, color: 'bg-muted text-muted-foreground' },
  password_change: { label: 'Password Changed', icon: Key, color: 'bg-amber-500/10 text-amber-500' },
  password_reset: { label: 'Password Reset', icon: Key, color: 'bg-amber-500/10 text-amber-500' },
  codebase_export: { label: 'Data Export', icon: Download, color: 'bg-blue-500/10 text-blue-500' },
  failed_login: { label: 'Failed Login', icon: AlertTriangle, color: 'bg-destructive/10 text-destructive' },
  token_refresh: { label: 'Session Refreshed', icon: RefreshCw, color: 'bg-muted text-muted-foreground' },
  email_change: { label: 'Email Changed', icon: Mail, color: 'bg-amber-500/10 text-amber-500' },
  email_change_requested: { label: 'Email Change Requested', icon: Mail, color: 'bg-blue-500/10 text-blue-500' },
  session_revoked: { label: 'Session Revoked', icon: ShieldOff, color: 'bg-destructive/10 text-destructive' },
  sessions_revoked_all: { label: 'All Sessions Revoked', icon: ShieldOff, color: 'bg-destructive/10 text-destructive' },
  account_deleted: { label: 'Account Deleted', icon: UserX, color: 'bg-destructive/10 text-destructive' },
  mfa_enabled: { label: 'MFA Enabled', icon: ShieldCheck, color: 'bg-emerald-500/10 text-emerald-500' },
  mfa_disabled: { label: 'MFA Disabled', icon: ShieldOff, color: 'bg-amber-500/10 text-amber-500' },
  profile_updated: { label: 'Profile Updated', icon: UserCog, color: 'bg-blue-500/10 text-blue-500' },
  encryption_enabled: { label: 'Encryption Enabled', icon: Lock, color: 'bg-emerald-500/10 text-emerald-500' },
  encryption_disabled: { label: 'Encryption Disabled', icon: Unlock, color: 'bg-amber-500/10 text-amber-500' },
};

function getEventInfo(type: string) {
  return eventConfig[type] || { label: type.replace(/_/g, ' '), icon: Monitor, color: 'bg-muted text-muted-foreground' };
}

function parseBrowser(ua: string | null): string {
  if (!ua) return 'Unknown device';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  return 'Other browser';
}

export function SecurityActivityLog() {
  const { user } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const fetchEvents = async (pageNum: number, append = false) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('id, event_type, created_at, event_details, ip_address, user_agent')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      const typed = (data || []) as unknown as AuditEvent[];
      setEvents(prev => append ? [...prev, ...typed] : typed);
      setHasMore((data?.length || 0) === PAGE_SIZE);
    } catch (err) {
      console.error('Failed to load security events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(0);
  }, [user]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchEvents(next, true);
  };

  if (loading && events.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Shield className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">No security events recorded yet.</p>
        <p className="text-xs mt-1">Login activity and account changes will appear here.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[400px]">
      <div className="space-y-2 pr-3">
        {events.map((event) => {
          const info = getEventInfo(event.event_type);
          const Icon = info.icon;
          return (
            <Card key={event.id} className="p-3 flex items-start gap-3 bg-card/50">
              <div className={`p-2 rounded-lg shrink-0 ${info.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{info.label}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{format(new Date(event.created_at), 'MMM d, yyyy h:mm a')}</span>
                  <span>·</span>
                  <span>{parseBrowser(event.user_agent)}</span>
                </div>
              </div>
            </Card>
          );
        })}

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load more'}
          </Button>
        )}
      </div>
    </ScrollArea>
  );
}
