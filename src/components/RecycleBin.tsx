import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trash2, 
  RotateCcw, 
  X, 
  FileText, 
  BookOpen,
  FolderOpen,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DeletedItem {
  id: string;
  title: string;
  type: 'card' | 'note' | 'file';
  deleted_at: string;
  permanent_delete_at: string;
  file_name?: string;
  number?: string;
}

export function RecycleBin() {
  const { user } = useAuth();
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoDeleteDays, setAutoDeleteDays] = useState<number>(30);
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchUserPreferences();
      fetchDeletedItems();
    }
  }, [user]);

  const fetchUserPreferences = async () => {
    if (!user) return;

    try {
      let { data, error } = await supabase
        .from('user_preferences')
        .select('auto_delete_days')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No preferences found, create default
        const { data: newPref, error: insertError } = await supabase
          .from('user_preferences')
          .insert({ user_id: user.id, auto_delete_days: 30 })
          .select()
          .single();

        if (insertError) throw insertError;
        data = newPref;
      } else if (error) {
        throw error;
      }

      if (data) {
        setAutoDeleteDays(data.auto_delete_days);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const fetchDeletedItems = async () => {
    if (!user) return;

    try {
      // Fetch deleted cards
      const { data: cards, error: cardsError } = await supabase
        .from('zettel_cards')
        .select('id, title, number, deleted_at, permanent_delete_at')
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null);

      if (cardsError) throw cardsError;

      // Fetch deleted notes
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('id, title, deleted_at, permanent_delete_at')
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null);

      if (notesError) throw notesError;

      // Fetch deleted files
      const { data: files, error: filesError } = await supabase
        .from('files')
        .select('id, file_name, deleted_at, permanent_delete_at')
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null);

      if (filesError) throw filesError;

      const allItems: DeletedItem[] = [
        ...(cards || []).map(c => ({ ...c, type: 'card' as const, title: c.title })),
        ...(notes || []).map(n => ({ ...n, type: 'note' as const, title: n.title })),
        ...(files || []).map(f => ({ ...f, type: 'file' as const, title: f.file_name, file_name: f.file_name })),
      ].sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

      setDeletedItems(allItems);
    } catch (error) {
      console.error('Error fetching deleted items:', error);
      toast.error('Failed to load recycle bin');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item: DeletedItem) => {
    try {
      const table = item.type === 'card' ? 'zettel_cards' : item.type === 'note' ? 'notes' : 'files';
      
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: null, permanent_delete_at: null })
        .eq('id', item.id);

      if (error) throw error;

      toast.success(`${item.type.charAt(0).toUpperCase() + item.type.slice(1)} restored`);
      fetchDeletedItems();
    } catch (error) {
      console.error('Error restoring item:', error);
      toast.error('Failed to restore item');
    }
  };

  const handlePermanentDelete = async (item: DeletedItem) => {
    if (!confirm(`Permanently delete this ${item.type}? This cannot be undone.`)) return;

    try {
      const table = item.type === 'card' ? 'zettel_cards' : item.type === 'note' ? 'notes' : 'files';
      
      // If it's a file, delete from storage first
      if (item.type === 'file') {
        const { data: fileData } = await supabase
          .from('files')
          .select('storage_path')
          .eq('id', item.id)
          .single();

        if (fileData) {
          await supabase.storage
            .from('documents')
            .remove([fileData.storage_path]);
        }
      }

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      toast.success(`${item.type.charAt(0).toUpperCase() + item.type.slice(1)} permanently deleted`);
      fetchDeletedItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleUpdateAutoDelete = async (days: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({ auto_delete_days: days })
        .eq('user_id', user.id);

      if (error) throw error;

      setAutoDeleteDays(days);
      toast.success(`Auto-delete set to ${days} days`);
      fetchDeletedItems();
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'card': return FileText;
      case 'note': return BookOpen;
      case 'file': return FolderOpen;
      default: return FileText;
    }
  };

  const filteredItems = activeTab === 'all' 
    ? deletedItems 
    : deletedItems.filter(item => item.type === activeTab);

  if (loading) {
    return (
      <div className="p-3 sm:p-4 space-y-3">
        <div className="animate-pulse space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Recycle Bin</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Restore or permanently delete items</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">Auto-delete:</span>
          <Select value={autoDeleteDays.toString()} onValueChange={(v) => handleUpdateAutoDelete(parseInt(v))}>
            <SelectTrigger className="w-24 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="15">15 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="all" className="text-xs">All ({deletedItems.length})</TabsTrigger>
          <TabsTrigger value="card" className="text-xs">
            Cards ({deletedItems.filter(i => i.type === 'card').length})
          </TabsTrigger>
          <TabsTrigger value="note" className="text-xs">
            Notes ({deletedItems.filter(i => i.type === 'note').length})
          </TabsTrigger>
          <TabsTrigger value="file" className="text-xs">
            Files ({deletedItems.filter(i => i.type === 'file').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-3">
          {filteredItems.length > 0 ? (
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const ItemIcon = getItemIcon(item.type);
                const daysUntilDelete = Math.ceil(
                  (new Date(item.permanent_delete_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <Card key={`${item.type}-${item.id}`} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                            <ItemIcon className="h-5 w-5 text-destructive" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium truncate">{item.title}</h3>
                              {item.number && (
                                <Badge variant="outline" className="text-xs">
                                  {item.number}
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs capitalize">
                                {item.type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                Deleted {format(new Date(item.deleted_at), 'MMM d, yyyy')}
                              </span>
                              <span>•</span>
                              <span className={daysUntilDelete <= 3 ? 'text-destructive font-medium' : ''}>
                                Permanent delete in {daysUntilDelete} days
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(item)}
                            className="text-primary hover:text-primary"
                            aria-label="Restore item"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePermanentDelete(item)}
                            className="text-destructive hover:text-destructive"
                            aria-label="Permanently delete"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trash2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium mb-1">Recycle bin is empty</p>
              <p className="text-xs text-muted-foreground">
                Deleted items will appear here
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
