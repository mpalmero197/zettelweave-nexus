import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, 
  RefreshCw, 
  Download, 
  Filter,
  Shield,
  User,
  Key,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  user_id: string | null;
  event_type: string;
  event_details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface AuditLogWithUser extends AuditLog {
  user_email?: string;
}

export function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, filterEventType, searchQuery]);

  const applyFilters = () => {
    let filtered = [...logs];

    // Event type filter
    if (filterEventType !== 'all') {
      filtered = filtered.filter(log => log.event_type === filterEventType);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.user_email?.toLowerCase().includes(query) ||
        log.event_type.toLowerCase().includes(query) ||
        JSON.stringify(log.event_details).toLowerCase().includes(query)
      );
    }

    setFilteredLogs(filtered);
  };

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      
      // Fetch audit logs
      const { data: logsData, error: logsError } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (logsError) throw logsError;

      // Fetch user emails for the logs
      const userIds = [...new Set(logsData?.map(log => log.user_id).filter(Boolean) || [])];
      const { data: usersData } = await supabase.rpc('get_all_users');

      // Create a map of user IDs to emails
      const userEmailMap = new Map(
        usersData?.map((user: any) => [user.id, user.email]) || []
      );

      // Combine logs with user emails
      const logsWithUsers: AuditLogWithUser[] = logsData?.map(log => ({
        ...log,
        ip_address: log.ip_address ? String(log.ip_address) : null,
        user_agent: log.user_agent || null,
        user_email: log.user_id ? userEmailMap.get(log.user_id) : 'System'
      })) || [];

      setLogs(logsWithUsers);
      setFilteredLogs(logsWithUsers);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventBadge = (eventType: string) => {
    const eventConfig: Record<string, { variant: any; icon: React.ReactNode; label: string }> = {
      'login_success': { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, label: 'Login Success' },
      'login_failed': { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, label: 'Login Failed' },
      'password_changed': { variant: 'default', icon: <Key className="h-3 w-3" />, label: 'Password Changed' },
      'role_changed': { variant: 'secondary', icon: <Shield className="h-3 w-3" />, label: 'Role Changed' },
      'user_banned': { variant: 'destructive', icon: <AlertTriangle className="h-3 w-3" />, label: 'User Banned' },
      'user_unbanned': { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, label: 'User Unbanned' },
      'codebase_export': { variant: 'secondary', icon: <FileText className="h-3 w-3" />, label: 'Codebase Export' },
      'subscription_created': { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, label: 'Subscription Created' },
      'subscription_updated': { variant: 'secondary', icon: <Activity className="h-3 w-3" />, label: 'Subscription Updated' },
      'subscription_cancelled': { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, label: 'Subscription Cancelled' },
      'admin_license_granted': { variant: 'default', icon: <Shield className="h-3 w-3" />, label: 'License Granted' },
      'admin_license_revoked': { variant: 'destructive', icon: <Shield className="h-3 w-3" />, label: 'License Revoked' },
    };

    const config = eventConfig[eventType] || { 
      variant: 'outline', 
      icon: <Activity className="h-3 w-3" />, 
      label: eventType 
    };

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        <span className="text-xs">{config.label}</span>
      </Badge>
    );
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'User', 'Event Type', 'Details', 'IP Address', 'User Agent'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.user_email || 'System',
        log.event_type,
        JSON.stringify(log.event_details || {}).replace(/,/g, ';'),
        log.ip_address || 'N/A',
        (log.user_agent || 'N/A').replace(/,/g, ';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Audit logs exported successfully",
    });
  };

  const eventTypes = [...new Set(logs.map(log => log.event_type))].sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Admin Audit Log</h2>
          <p className="text-muted-foreground">
            Track all sensitive administrative actions and security events
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAuditLogs}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportLogs}
            disabled={filteredLogs.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Type</label>
              <Select value={filterEventType} onValueChange={setFilterEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {eventTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search by user, event type, or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filtered Events</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLogs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter(l => l.event_type.includes('role') || l.event_type.includes('ban')).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter(l => l.event_type === 'login_failed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Showing {filteredLogs.length} of {logs.length} total events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Activity className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No audit logs found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{log.user_email || 'System'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getEventBadge(log.event_type)}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.event_details, null, 2)}
                        </pre>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.ip_address || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
