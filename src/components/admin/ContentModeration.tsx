import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Shield, 
  Activity,
  Lock,
  Eye,
  TrendingUp,
  Database,
  Users,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ContentStats {
  totalCards: number;
  totalNotes: number;
  cardsToday: number;
  notesToday: number;
  cardsThisWeek: number;
  notesThisWeek: number;
  averageCardsPerUser: number;
  averageNotesPerUser: number;
  encryptedCards: number;
  encryptedNotes: number;
}

export function ContentModeration() {
  const [stats, setStats] = useState<ContentStats>({
    totalCards: 0,
    totalNotes: 0,
    cardsToday: 0,
    notesToday: 0,
    cardsThisWeek: 0,
    notesThisWeek: 0,
    averageCardsPerUser: 0,
    averageNotesPerUser: 0,
    encryptedCards: 0,
    encryptedNotes: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchContentStats();
  }, []);

  const fetchContentStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const [
        { count: totalCards },
        { count: totalNotes },
        { data: cardsToday },
        { data: notesToday },
        { data: cardsThisWeek },
        { data: notesThisWeek },
        { data: allUsers },
        { count: encryptedCards },
        { count: encryptedNotes },
      ] = await Promise.all([
        supabase.from('zettel_cards').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('notes').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('zettel_cards').select('id').gte('created_at', today.toISOString()).is('deleted_at', null),
        supabase.from('notes').select('id').gte('created_at', today.toISOString()).is('deleted_at', null),
        supabase.from('zettel_cards').select('id').gte('created_at', oneWeekAgo.toISOString()).is('deleted_at', null),
        supabase.from('notes').select('id').gte('created_at', oneWeekAgo.toISOString()).is('deleted_at', null),
        supabase.rpc('get_all_users'),
        supabase.from('zettel_cards').select('id', { count: 'exact', head: true }).eq('is_encrypted', true).is('deleted_at', null),
        supabase.from('notes').select('id', { count: 'exact', head: true }).eq('is_encrypted', true).is('deleted_at', null),
      ]);

      const userCount = allUsers?.length || 1;

      setStats({
        totalCards: totalCards || 0,
        totalNotes: totalNotes || 0,
        cardsToday: cardsToday?.length || 0,
        notesToday: notesToday?.length || 0,
        cardsThisWeek: cardsThisWeek?.length || 0,
        notesThisWeek: notesThisWeek?.length || 0,
        averageCardsPerUser: Math.round((totalCards || 0) / userCount * 10) / 10,
        averageNotesPerUser: Math.round((totalNotes || 0) / userCount * 10) / 10,
        encryptedCards: encryptedCards || 0,
        encryptedNotes: encryptedNotes || 0,
      });
    } catch (error: any) {
      console.error('Error fetching content stats:', error);
      toast({
        title: "Error",
        description: "Failed to load content statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Activity className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading content statistics...</p>
        </div>
      </div>
    );
  }

  const encryptionRate = stats.totalCards + stats.totalNotes > 0 
    ? ((stats.encryptedCards + stats.encryptedNotes) / (stats.totalCards + stats.totalNotes) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Privacy Notice */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-background border border-green-500/20 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-green-500/10">
            <Shield className="h-6 w-6 text-green-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-1">Privacy-First Content Monitoring</h2>
            <p className="text-muted-foreground text-sm">
              This dashboard shows only aggregate statistics. <strong>Card and note contents are never visible to administrators</strong> to protect user privacy. 
              All user data is encrypted and stored securely.
            </p>
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <Lock className="h-3 w-3 mr-1" />
            Protected
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/10 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cards</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <FileText className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalCards.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-0">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{stats.cardsToday} today
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Notes</CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10">
              <FileText className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalNotes.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-0">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{stats.notesToday} today
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Encrypted Items</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10">
              <Lock className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(stats.encryptedCards + stats.encryptedNotes).toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-muted-foreground">
                {encryptionRate.toFixed(1)}% encryption rate
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg per User</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.averageCardsPerUser}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-muted-foreground">
                cards • {stats.averageNotesPerUser} notes
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cards Metrics */}
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              Knowledge Cards Metrics
            </CardTitle>
            <CardDescription>Aggregate card statistics (content hidden)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Cards</span>
                <span className="font-medium">{stats.totalCards.toLocaleString()}</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created This Week</span>
                <span className="font-medium text-green-500">+{stats.cardsThisWeek}</span>
              </div>
              <Progress 
                value={Math.min((stats.cardsThisWeek / Math.max(stats.totalCards, 1)) * 100, 100)} 
                className="h-2" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Encrypted Cards</span>
                <span className="font-medium text-green-500">{stats.encryptedCards.toLocaleString()}</span>
              </div>
              <Progress 
                value={Math.min((stats.encryptedCards / Math.max(stats.totalCards, 1)) * 100, 100)} 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground">
                {((stats.encryptedCards / Math.max(stats.totalCards, 1)) * 100).toFixed(1)}% of cards are encrypted
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notes Metrics */}
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-amber-500" />
              Notes Metrics
            </CardTitle>
            <CardDescription>Aggregate note statistics (content hidden)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Notes</span>
                <span className="font-medium">{stats.totalNotes.toLocaleString()}</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created This Week</span>
                <span className="font-medium text-green-500">+{stats.notesThisWeek}</span>
              </div>
              <Progress 
                value={Math.min((stats.notesThisWeek / Math.max(stats.totalNotes, 1)) * 100, 100)} 
                className="h-2" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Encrypted Notes</span>
                <span className="font-medium text-green-500">{stats.encryptedNotes.toLocaleString()}</span>
              </div>
              <Progress 
                value={Math.min((stats.encryptedNotes / Math.max(stats.totalNotes, 1)) * 100, 100)} 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground">
                {((stats.encryptedNotes / Math.max(stats.totalNotes, 1)) * 100).toFixed(1)}% of notes are encrypted
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Protection Info */}
      <Card className="border-primary/10 bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">What administrators CAN see:</h3>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Aggregate counts and statistics (total cards, notes, files)</li>
                <li>• Growth metrics and trends over time</li>
                <li>• Encryption adoption rates</li>
                <li>• User account metadata (not content)</li>
              </ul>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Lock className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-medium">What administrators CANNOT see:</h3>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Card titles, descriptions, or content</li>
                <li>• Note titles or content</li>
                <li>• User-uploaded files or attachments</li>
                <li>• Any encrypted data</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
