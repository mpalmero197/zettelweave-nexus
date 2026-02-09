import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, Check, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CatalystCommentsProps {
  documentId: string | null;
}

export function CatalystComments({ documentId }: CatalystCommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['catalyst_comments', documentId, showResolved],
    queryFn: async () => {
      if (!documentId || !user) return [];
      let query = supabase
        .from('catalyst_comments')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!showResolved) {
        query = query.eq('resolved', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!documentId && !!user,
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!documentId || !user) throw new Error('No document');
      const { error } = await supabase
        .from('catalyst_comments')
        .insert({
          document_id: documentId,
          user_id: user.id,
          text: newComment,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalyst_comments', documentId] });
      setNewComment('');
    },
  });

  const toggleResolved = useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      const { error } = await supabase
        .from('catalyst_comments')
        .update({ resolved: !resolved })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalyst_comments', documentId] });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('catalyst_comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalyst_comments', documentId] });
    },
  });

  if (!documentId) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Save your document first to add comments</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Add comment */}
      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a note or comment..."
          className="text-sm min-h-[60px] resize-none"
        />
        <Button
          size="sm"
          onClick={() => addComment.mutate()}
          disabled={!newComment.trim() || addComment.isPending}
          className="w-full"
        >
          {addComment.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
          Add Comment
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Button
          variant={showResolved ? 'outline' : 'default'}
          size="sm"
          className="h-7 text-xs flex-1"
          onClick={() => setShowResolved(false)}
        >
          Open ({comments.filter(c => !c.resolved).length})
        </Button>
        <Button
          variant={showResolved ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs flex-1"
          onClick={() => setShowResolved(true)}
        >
          All
        </Button>
      </div>

      {/* Comments list */}
      <ScrollArea className="h-[240px]">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No comments yet</p>
        ) : (
          <div className="space-y-2">
            {comments.map((comment: any) => (
              <div
                key={comment.id}
                className={`p-2 border rounded-lg ${comment.resolved ? 'opacity-60' : ''}`}
              >
                <p className="text-sm whitespace-pre-wrap">{comment.text}</p>
                {comment.anchor_text && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    Re: "{comment.anchor_text}"
                  </p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => toggleResolved.mutate({ id: comment.id, resolved: comment.resolved })}
                      title={comment.resolved ? 'Reopen' : 'Resolve'}
                    >
                      <Check className={`h-3 w-3 ${comment.resolved ? 'text-primary' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => deleteComment.mutate(comment.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
