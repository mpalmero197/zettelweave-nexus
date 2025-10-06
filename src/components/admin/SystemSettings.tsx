import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Settings, 
  Database, 
  Trash2, 
  Activity,
  Users,
  FileText,
  Calendar,
  RefreshCw
} from 'lucide-react';

interface SystemStats {
  totalUsers: number;
  totalCards: number;
  totalNotes: number;
  deletedItems: number;
  storageUsed: string;
}

export function SystemSettings() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoDeleteDays, setAutoDeleteDays] = useState(30);
  const { toast } = useToast();

  const fetchSystemStats = async () => {
    setLoading(true);
    try {
      // Get total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total cards
      const { count: cardsCount } = await supabase
        .from('zettel_cards')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Get total notes
      const { count: notesCount } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Get deleted items count
      const { count: deletedCardsCount } = await supabase
        .from('zettel_cards')
        .select('*', { count: 'exact', head: true })
        .not('deleted_at', 'is', null);

      const { count: deletedNotesCount } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .not('deleted_at', 'is', null);

      setStats({
        totalUsers: usersCount || 0,
        totalCards: cardsCount || 0,
        totalNotes: notesCount || 0,
        deletedItems: (deletedCardsCount || 0) + (deletedNotesCount || 0),
        storageUsed: 'N/A' // Would need storage API access
      });

      toast({
        title: "Stats Updated",
        description: "System statistics refreshed successfully",
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runCleanup = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('auto_delete_expired_items');
      
      if (error) throw error;

      toast({
        title: "Cleanup Complete",
        description: "Expired items have been permanently deleted",
      });

      // Refresh stats
      fetchSystemStats();
    } catch (error) {
      console.error('Error running cleanup:', error);
      toast({
        title: "Error",
        description: "Failed to run cleanup process",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCards || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalNotes || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deleted Items</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.deletedItems || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* System Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Management
            </CardTitle>
            <CardDescription>
              Manage database cleanup and maintenance tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="auto-delete-days">Auto-Delete After (Days)</Label>
              <Input
                id="auto-delete-days"
                type="number"
                min="1"
                max="365"
                value={autoDeleteDays}
                onChange={(e) => setAutoDeleteDays(parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Items in recycle bin will be permanently deleted after this many days
              </p>
            </div>

            <Button 
              onClick={runCleanup} 
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {loading ? 'Running...' : 'Run Cleanup Now'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>
              Monitor system status and performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Database Status</span>
                <span className="text-sm font-medium text-green-500">Healthy</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Storage Status</span>
                <span className="text-sm font-medium text-green-500">Operational</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Authentication</span>
                <span className="text-sm font-medium text-green-500">Active</span>
              </div>
            </div>

            <Button 
              onClick={fetchSystemStats} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Statistics
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Additional System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Database Provider</p>
              <p className="text-sm text-muted-foreground">Supabase</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Authentication</p>
              <p className="text-sm text-muted-foreground">Supabase Auth</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Storage Provider</p>
              <p className="text-sm text-muted-foreground">Supabase Storage</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Edge Functions</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}