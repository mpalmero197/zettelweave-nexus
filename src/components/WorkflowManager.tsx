import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Zap, Plus, Play, Pause, Trash2, Clock, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Workflow {
  id: string;
  name: string;
  description: string;
  workflow_type: 'monitor_topic' | 'periodic_search' | 'keyword_alert';
  status: 'active' | 'paused' | 'completed' | 'failed';
  config: {
    topics?: string[];
    keywords?: string[];
    target_notebook_id?: string;
    frequency?: string;
    max_results?: number;
  };
  last_executed_at: string | null;
  next_execution_at: string | null;
  execution_count: number;
  created_at: string;
}

interface WorkflowFormData {
  name: string;
  description: string;
  topics: string[];
  keywords: string[];
  target_notebook_id: string;
  frequency: string;
  max_results: number;
}

export function WorkflowManager() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<WorkflowFormData>({
    name: '',
    description: '',
    topics: [],
    keywords: [],
    target_notebook_id: '',
    frequency: 'daily',
    max_results: 5,
  });

  const { data: workflows } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Workflow[];
    },
  });

  const { data: notebooks } = useQuery({
    queryKey: ['notebooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notebooks')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const createWorkflowMutation = useMutation({
    mutationFn: async (data: WorkflowFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const nextExecutionAt = new Date();
      if (data.frequency === 'hourly') nextExecutionAt.setHours(nextExecutionAt.getHours() + 1);
      else if (data.frequency === 'daily') nextExecutionAt.setDate(nextExecutionAt.getDate() + 1);
      else if (data.frequency === 'weekly') nextExecutionAt.setDate(nextExecutionAt.getDate() + 7);
      else if (data.frequency === 'monthly') nextExecutionAt.setMonth(nextExecutionAt.getMonth() + 1);

      const { error } = await supabase.from('workflows').insert({
        user_id: user.id,
        name: data.name,
        description: data.description,
        workflow_type: 'monitor_topic',
        status: 'active',
        config: {
          topics: data.topics,
          keywords: data.keywords,
          target_notebook_id: data.target_notebook_id,
          frequency: data.frequency,
          max_results: data.max_results,
        },
        next_execution_at: nextExecutionAt.toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow created successfully');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create workflow: ${error.message}`);
    },
  });

  const toggleWorkflowMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: 'active' | 'paused' | 'completed' | 'failed' }) => {
      const { error } = await supabase
        .from('workflows')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow status updated');
    },
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workflows').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow deleted');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      topics: [],
      keywords: [],
      target_notebook_id: '',
      frequency: 'daily',
      max_results: 5,
    });
    setTopicInput('');
    setKeywordInput('');
  };

  const addTopic = () => {
    if (topicInput.trim() && !formData.topics.includes(topicInput.trim())) {
      setFormData(prev => ({ ...prev, topics: [...prev.topics, topicInput.trim()] }));
      setTopicInput('');
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData(prev => ({ ...prev, keywords: [...prev.keywords, keywordInput.trim()] }));
      setKeywordInput('');
    }
  };

  const removeTopic = (topic: string) => {
    setFormData(prev => ({ ...prev, topics: prev.topics.filter(t => t !== topic) }));
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({ ...prev, keywords: prev.keywords.filter(k => k !== keyword) }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-4 w-4 text-green-500" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Automated Workflows
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Monitor topics and automatically save findings to notebooks
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Create Workflow</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Workflow</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label>Workflow Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., AI Research Tracker"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What should this workflow monitor?"
                />
              </div>

              <div>
                <Label>Topics to Monitor</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTopic()}
                    placeholder="Add a topic (e.g., Artificial Intelligence)"
                  />
                  <Button type="button" onClick={addTopic}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.topics.map(topic => (
                    <Badge key={topic} variant="secondary" className="cursor-pointer" onClick={() => removeTopic(topic)}>
                      {topic} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Keywords (Optional)</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                    placeholder="Add keyword filters (e.g., breakthrough, research)"
                  />
                  <Button type="button" onClick={addKeyword}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.keywords.map(keyword => (
                    <Badge key={keyword} variant="outline" className="cursor-pointer" onClick={() => removeKeyword(keyword)}>
                      {keyword} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Save Results To</Label>
                <Select 
                  value={formData.target_notebook_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, target_notebook_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a notebook" />
                  </SelectTrigger>
                  <SelectContent>
                    {notebooks?.map(notebook => (
                      <SelectItem key={notebook.id} value={notebook.id}>
                        {notebook.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Frequency</Label>
                  <Select 
                    value={formData.frequency} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Max Results</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.max_results}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_results: parseInt(e.target.value) || 5 }))}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => createWorkflowMutation.mutate(formData)}
                disabled={!formData.name || formData.topics.length === 0 || !formData.target_notebook_id}
              >
                Create Workflow
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows?.map(workflow => (
            <Card key={workflow.id} className="border-primary/20">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(workflow.status)}
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                  </div>
                  <Badge variant={workflow.status === 'active' ? 'default' : 'secondary'}>
                    {workflow.status}
                  </Badge>
                </div>
                <CardDescription>{workflow.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Topics:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(workflow.config.topics || []).map((topic: string) => (
                      <Badge key={topic} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Frequency: {workflow.config.frequency || 'daily'}
                  </div>
                  <div className="text-muted-foreground">
                    Executed {workflow.execution_count || 0} times
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => toggleWorkflowMutation.mutate({
                      id: workflow.id,
                      newStatus: workflow.status === 'active' ? 'paused' : 'active',
                    })}
                  >
                    {workflow.status === 'active' ? (
                      <>
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Resume
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteWorkflowMutation.mutate(workflow.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!workflows || workflows.length === 0 && (
          <div className="text-center py-8">
            <Zap className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
            <p className="text-sm font-semibold mb-1">No Workflows Yet</p>
            <p className="text-xs text-muted-foreground mb-3">
              Create your first automated workflow to start monitoring topics
            </p>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Workflow
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
