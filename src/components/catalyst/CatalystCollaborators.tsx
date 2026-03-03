import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Trash2, Shield, Eye, Edit3, MessageSquare, Loader2, Crown, Search } from 'lucide-react';

interface CatalystCollaboratorsProps {
  documentId: string | null;
  documentTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Collaborator {
  id: string;
  document_id: string;
  owner_id: string;
  collaborator_id: string;
  permission: 'view' | 'comment' | 'edit';
  status: 'pending' | 'accepted' | 'declined';
  invited_at: string;
  accepted_at: string | null;
  collaborator_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  collaborator_email?: string;
}

const PERMISSION_OPTIONS = [
  { value: 'view', label: 'View Only', icon: Eye, description: 'Can read the document' },
  { value: 'comment', label: 'Comment', icon: MessageSquare, description: 'Can read and comment' },
  { value: 'edit', label: 'Edit', icon: Edit3, description: 'Can read, comment, and edit' },
];

export function CatalystCollaborators({ documentId, documentTitle, open, onOpenChange }: CatalystCollaboratorsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<'view' | 'comment' | 'edit'>('view');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ user_id: string; display_name: string; email: string | null; is_friend: boolean }>>([]);

  // Fetch collaborators for this document
  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ['catalyst_collaborators', documentId],
    queryFn: async () => {
      if (!documentId || !user) return [];
      const { data, error } = await supabase
        .from('catalyst_collaborators')
        .select('*')
        .eq('document_id', documentId);
      if (error) throw error;
      
      // Fetch profiles for each collaborator
      const collabIds = (data || []).map(c => c.collaborator_id);
      if (collabIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', collabIds);
      
      return (data || []).map(c => ({
        ...c,
        collaborator_profile: profiles?.find(p => p.user_id === c.collaborator_id) || null,
      })) as Collaborator[];
    },
    enabled: !!documentId && !!user,
  });

  const handleSearchUsers = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      toast({ title: 'Enter at least 2 characters to search', variant: 'destructive' });
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_users', { _search_query: searchQuery.trim() });
      if (error) throw error;
      // Filter out current user and existing collaborators
      const existingIds = new Set(collaborators.map(c => c.collaborator_id));
      const filtered = (data || [])
        .filter(u => u.user_id !== user?.id && !existingIds.has(u.user_id))
        .slice(0, 10);
      setSearchResults(filtered);
    } catch (error: any) {
      toast({ title: 'Search failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const addCollaboratorMutation = useMutation({
    mutationFn: async (collaboratorId: string) => {
      if (!documentId || !user) throw new Error('Not ready');
      const { error } = await supabase.from('catalyst_collaborators').insert({
        document_id: documentId,
        owner_id: user.id,
        collaborator_id: collaboratorId,
        permission: selectedPermission,
        status: 'accepted', // Auto-accept for now; could be 'pending' for invite flow
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalyst_collaborators', documentId] });
      setSearchResults([]);
      setSearchQuery('');
      toast({ title: 'Collaborator added', description: 'They can now access this document.' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to add', description: error.message, variant: 'destructive' });
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ id, permission }: { id: string; permission: string }) => {
      const { error } = await supabase
        .from('catalyst_collaborators')
        .update({ permission })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalyst_collaborators', documentId] });
      toast({ title: 'Permission updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    },
  });

  const removeCollaboratorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('catalyst_collaborators')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalyst_collaborators', documentId] });
      toast({ title: 'Collaborator removed' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    },
  });

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!documentId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
            <DialogDescription>Save your document first before sharing it with collaborators.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share "{documentTitle}"
          </DialogTitle>
          <DialogDescription>
            Invite collaborators to view, comment, or edit this document in real time.
          </DialogDescription>
        </DialogHeader>

        {/* Search & Add */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                className="pl-9"
              />
            </div>
            <Select value={selectedPermission} onValueChange={(v) => setSelectedPermission(v as any)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERMISSION_OPTIONS.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    <span className="flex items-center gap-1.5">
                      <p.icon className="h-3 w-3" />
                      {p.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSearchUsers} disabled={isSearching} size="sm">
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y">
              {searchResults.map(user => (
                <div key={user.user_id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{getInitials(user.display_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user.display_name || 'Unknown'}</p>
                      {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                    </div>
                    {user.is_friend && <Badge variant="outline" className="text-[10px]">Friend</Badge>}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addCollaboratorMutation.mutate(user.user_id)}
                    disabled={addCollaboratorMutation.isPending}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Current Collaborators */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            {collaborators.length === 0 ? 'No collaborators yet' : `${collaborators.length} collaborator${collaborators.length !== 1 ? 's' : ''}`}
          </h4>
          <ScrollArea className="max-h-[250px]">
            <div className="space-y-1">
              {/* Owner */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      <Crown className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">You (Owner)</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20">Owner</Badge>
              </div>

              {collaborators.map(collab => (
                <div key={collab.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(collab.collaborator_profile?.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {collab.collaborator_profile?.display_name || 'Unknown User'}
                      </p>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className={`text-[10px] ${
                          collab.status === 'accepted' ? 'border-green-500/30 text-green-600' :
                          collab.status === 'pending' ? 'border-yellow-500/30 text-yellow-600' :
                          'border-red-500/30 text-red-600'
                        }`}>
                          {collab.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Select
                      value={collab.permission}
                      onValueChange={(v) => updatePermissionMutation.mutate({ id: collab.id, permission: v })}
                    >
                      <SelectTrigger className="h-7 w-[100px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERMISSION_OPTIONS.map(p => (
                          <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                      onClick={() => removeCollaboratorMutation.mutate(collab.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
