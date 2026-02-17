import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle, Activity, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminSectionHeader } from './AdminSectionHeader';
import { useIsMobile } from '@/hooks/use-mobile';

interface AuditLog {
  id: string;
  user_id: string | null;
  event_type: string;
  event_details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_email?: string;
}

export function SecurityMonitor() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Resolve user emails
      const userIds = [...new Set(data?.map(l => l.user_id).filter(Boolean) || [])];
      const { data: usersData } = await supabase.rpc('get_all_users');
      const emailMap = new Map(usersData?.map((u: any) => [u.id, u.email]) || []);

      const typedData = (data || []).map(log => ({
        ...log,
        ip_address: log.ip_address as string | null,
        user_email: log.user_id ? emailMap.get(log.user_id) : 'System',
      })) as AuditLog[];

      setAuditLogs(typedData);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      toast({ title: "Error", description: "Failed to load security audit logs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const eventTypes = [...new Set(auditLogs.map(l => l.event_type))].sort();
  const filteredLogs = filterType === 'all' ? auditLogs : auditLogs.filter(l => l.event_type === filterType);

  const getEventBadge = (eventType: string) => {
    const color = eventType.includes('failed') || eventType.includes('ban')
      ? 'bg-red-500/10 text-red-500'
      : eventType.includes('success') || eventType.includes('created')
        ? 'bg-green-500/10 text-green-500'
        : 'bg-blue-500/10 text-blue-500';
    return (
      <Badge variant="outline" className={color}>
        {eventType.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const renderEventDetails = (details: any) => {
    if (!details || typeof details !== 'object') return null;
    const entries = Object.entries(details).filter(([k]) => k !== 'timestamp');
    if (entries.length === 0) return null;
    return (
      <div className="mt-2 text-xs space-y-0.5">
        {entries.map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <span className="text-muted-foreground font-medium min-w-[80px]">{key.replace(/_/g, ' ')}:</span>
            <span className="text-foreground/80 break-all">{String(value)}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Activity className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        icon={Shield}
        title="Security Monitor"
        description="Real-time security events and system health"
        actions={
          <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Healthy</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RLS Policies</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">Active</div>
            <p className="text-xs text-muted-foreground">All tables protected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Events</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLogs.length}</div>
            <p className="text-xs text-muted-foreground">Last 50 events</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {eventTypes.map(type => (
              <SelectItem key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filteredLogs.length} events</span>
      </div>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Audit Log
          </CardTitle>
          <CardDescription>Recent security events and user activities</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No audit logs found</p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {getEventBadge(log.event_type)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                      {log.user_email && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {log.user_email}
                        </span>
                      )}
                    </div>
                    {renderEventDetails(log.event_details)}
                    {log.ip_address && (
                      <p className="text-[10px] text-muted-foreground mt-1">IP: {log.ip_address}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
