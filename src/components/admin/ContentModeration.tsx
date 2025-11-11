import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Eye, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
  type: 'card' | 'note';
}

export function ContentModeration() {
  const [recentCards, setRecentCards] = useState<ContentItem[]>([]);
  const [recentNotes, setRecentNotes] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRecentContent();
  }, []);

  const fetchRecentContent = async () => {
    try {
      // Get recent cards - only metadata, NO content for privacy
      const { data: cards } = await supabase
        .from('zettel_cards')
        .select('id, title, user_id, created_at, category, tags')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20);

      // Get recent notes - only metadata, NO content for privacy
      const { data: notes } = await supabase
        .from('notes')
        .select('id, title, user_id, created_at, tags, is_favorite')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20);

      setRecentCards(cards?.map(c => ({ ...c, type: 'card' as const, content: '' })) || []);
      setRecentNotes(notes?.map(n => ({ ...n, type: 'note' as const, content: '' })) || []);
    } catch (error: any) {
      console.error('Error fetching content:', error);
      toast({
        title: "Error",
        description: "Failed to load content",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Admin deletion removed for security and privacy
  // Admins should not be able to delete user content

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const renderContentList = (items: ContentItem[]) => (
    <ScrollArea className="h-[500px]">
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No content found</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{item.title}</h3>
                    <Badge variant="outline" className="text-xs">
                      {item.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Created: {formatDate(item.created_at)}</span>
                    <span>User ID: {item.user_id.slice(0, 8)}...</span>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    Content hidden for privacy - Admins can only see metadata
                  </p>
                </div>
                {/* Delete button removed - admins cannot delete user content */}
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Activity className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Content Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Cards</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentCards.length}</div>
            <p className="text-xs text-muted-foreground">
              Last 20 cards created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Notes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentNotes.length}</div>
            <p className="text-xs text-muted-foreground">
              Last 20 notes created
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content Lists */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Content Metadata Monitor
          </CardTitle>
          <CardDescription>
            View content metadata only - user privacy is protected. Admins cannot read, modify, or delete user notes and cards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cards">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cards">Cards ({recentCards.length})</TabsTrigger>
              <TabsTrigger value="notes">Notes ({recentNotes.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="cards" className="mt-4">
              {renderContentList(recentCards)}
            </TabsContent>
            <TabsContent value="notes" className="mt-4">
              {renderContentList(recentNotes)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
