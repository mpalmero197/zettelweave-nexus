import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Plus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Kind = 'preference' | 'fact' | 'project' | 'person' | 'rule';

interface Memory {
  id: string;
  kind: Kind;
  key: string;
  value: string;
  source: 'auto' | 'manual';
  weight: number;
  created_at: string;
}

const KIND_OPTIONS: Kind[] = ['preference', 'fact', 'project', 'person', 'rule'];

export function AliceMemoryPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newKind, setNewKind] = useState<Kind>('preference');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ['alice_memories', user?.id],
    queryFn: async () => {
      if (!user) return [] as Memory[];
      const { data, error } = await supabase
        .from('alice_memories')
        .select('id,kind,key,value,source,weight,created_at')
        .order('weight', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Memory[];
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const key = newKey.trim().slice(0, 80);
      const value = newValue.trim().slice(0, 500);
      if (!key || !value) throw new Error('Key and value required');
      const { error } = await supabase.from('alice_memories').insert({
        user_id: user!.id,
        kind: newKind,
        key,
        value,
        source: 'manual',
        weight: 2.0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewKey('');
      setNewValue('');
      qc.invalidateQueries({ queryKey: ['alice_memories', user?.id] });
      toast({ title: 'Memory saved', description: 'ALICE will use this in future replies.' });
    },
    onError: (e: any) => toast({ title: 'Could not save', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('alice_memories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alice_memories', user?.id] });
      toast({ title: 'Forgotten' });
    },
  });

  const grouped = KIND_OPTIONS.map((k) => ({
    kind: k,
    items: memories.filter((m) => m.kind === k),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-1 flex items-center gap-2">
          <Brain className="h-5 w-5" />
          ALICE Memory
        </h3>
        <p className="text-sm text-muted-foreground">
          Things ALICE remembers about you across every conversation. She also adds new memories automatically as she learns stable facts.
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <h4 className="text-sm font-medium">Add a memory</h4>
        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2">
          <Select value={newKind} onValueChange={(v) => setNewKind(v as Kind)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {KIND_OPTIONS.map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Short key (e.g. writing_style)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            maxLength={80}
          />
        </div>
        <Textarea
          placeholder="What should ALICE remember? (e.g. I always write in first person, present tense.)"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          maxLength={500}
          rows={2}
        />
        <div className="flex justify-end">
          <Button
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending || !newKey.trim() || !newValue.trim()}
            size="sm"
          >
            {addMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Save memory
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : memories.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No memories yet. ALICE will start adding them as you chat.
        </p>
      ) : (
        <div className="space-y-5">
          {grouped.map((g) => (
            <div key={g.kind}>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wide">{g.kind}</h4>
              <div className="space-y-2">
                {g.items.map((m) => (
                  <Card key={m.id} className="p-3 flex items-start justify-between gap-3 group">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium truncate">{m.key}</span>
                        <Badge variant={m.source === 'manual' ? 'default' : 'secondary'} className="text-[10px]">
                          {m.source}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground break-words">{m.value}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-60 group-hover:opacity-100 text-destructive shrink-0"
                      onClick={() => deleteMutation.mutate(m.id)}
                      title="Forget this"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
