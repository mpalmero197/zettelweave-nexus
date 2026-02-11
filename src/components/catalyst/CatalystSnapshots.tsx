import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Camera, RotateCcw, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import DOMPurify from 'dompurify';

interface CatalystSnapshotsProps {
  documentId: string | null;
  currentContent: string;
  wordCount: number;
  onRestore: (content: string) => void;
}

export function CatalystSnapshots({ documentId, currentContent, wordCount, onRestore }: CatalystSnapshotsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [snapshotTitle, setSnapshotTitle] = useState('');
  const [previewSnapshot, setPreviewSnapshot] = useState<any>(null);

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['catalyst_snapshots', documentId],
    queryFn: async () => {
      if (!documentId || !user) return [];
      const { data, error } = await supabase
        .from('catalyst_snapshots')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!documentId && !!user,
  });

  const createSnapshot = useMutation({
    mutationFn: async () => {
      if (!documentId || !user) throw new Error('No document');
      const { error } = await supabase
        .from('catalyst_snapshots')
        .insert({
          document_id: documentId,
          user_id: user.id,
          title: snapshotTitle || `Snapshot ${new Date().toLocaleString()}`,
          content: currentContent,
          word_count: wordCount,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalyst_snapshots', documentId] });
      setSnapshotTitle('');
      toast({ title: 'Snapshot saved', description: 'You can restore this version anytime.' });
    },
  });

  const deleteSnapshot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('catalyst_snapshots').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalyst_snapshots', documentId] });
    },
  });

  const handleRestore = (snapshot: any) => {
    onRestore(snapshot.content);
    setPreviewSnapshot(null);
    toast({ title: 'Restored', description: `Restored to "${snapshot.title}"` });
  };

  if (!documentId) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Camera className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Save your document first to create snapshots</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={snapshotTitle}
          onChange={(e) => setSnapshotTitle(e.target.value)}
          placeholder="Snapshot name (optional)"
          className="h-8 text-sm"
        />
        <Button
          size="sm"
          onClick={() => createSnapshot.mutate()}
          disabled={createSnapshot.isPending}
          className="shrink-0"
        >
          {createSnapshot.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4 mr-1" />}
          Save
        </Button>
      </div>

      <ScrollArea className="h-[280px]">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : snapshots.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No snapshots yet</p>
        ) : (
          <div className="space-y-2">
            {snapshots.map((snap: any) => (
              <div key={snap.id} className="p-2 border rounded-lg hover:bg-muted/30 group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{snap.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {snap.word_count?.toLocaleString()} words · {new Date(snap.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setPreviewSnapshot(snap)}
                      title="Preview & Restore"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => deleteSnapshot.mutate(snap.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Preview Dialog */}
      <Dialog open={!!previewSnapshot} onOpenChange={() => setPreviewSnapshot(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Snapshot: {previewSnapshot?.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] border rounded-lg p-4">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewSnapshot?.content || '') }}
            />
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewSnapshot(null)}>Cancel</Button>
            <Button onClick={() => handleRestore(previewSnapshot)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore This Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
