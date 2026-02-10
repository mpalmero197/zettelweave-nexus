import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { AgentConfig, AgentType } from '@/types/agents';
import { useState } from 'react';

interface AgentConfigFieldsProps {
  agentType: AgentType;
  config: AgentConfig;
  onChange: (config: AgentConfig) => void;
  disabled?: boolean;
}

export function AgentConfigFields({ agentType, config, onChange, disabled }: AgentConfigFieldsProps) {
  const [newTopic, setNewTopic] = useState('');
  const [newSource, setNewSource] = useState('');

  const update = (partial: Partial<AgentConfig>) => {
    onChange({ ...config, ...partial });
  };

  const addToList = (key: 'topics' | 'sources', value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    const current = config[key] || [];
    if (!current.includes(value.trim())) {
      update({ [key]: [...current, value.trim()] });
    }
    setter('');
  };

  const removeFromList = (key: 'topics' | 'sources', value: string) => {
    update({ [key]: (config[key] || []).filter(v => v !== value) });
  };

  switch (agentType) {
    case 'research':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Research Topics</Label>
            <div className="flex gap-2">
              <Input
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                placeholder="Add a topic..."
                disabled={disabled}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addToList('topics', newTopic, setNewTopic))}
              />
              <Button size="sm" variant="outline" onClick={() => addToList('topics', newTopic, setNewTopic)} disabled={disabled}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {(config.topics || []).map(t => (
                <Badge key={t} variant="secondary" className="gap-1">
                  {t}
                  {!disabled && <X className="h-3 w-3 cursor-pointer" onClick={() => removeFromList('topics', t)} />}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Sources</Label>
            <div className="flex gap-2">
              <Input
                value={newSource}
                onChange={e => setNewSource(e.target.value)}
                placeholder="web, academic, arxiv..."
                disabled={disabled}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addToList('sources', newSource, setNewSource))}
              />
              <Button size="sm" variant="outline" onClick={() => addToList('sources', newSource, setNewSource)} disabled={disabled}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {(config.sources || []).map(s => (
                <Badge key={s} variant="secondary" className="gap-1">
                  {s}
                  {!disabled && <X className="h-3 w-3 cursor-pointer" onClick={() => removeFromList('sources', s)} />}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      );

    case 'habit_reminder':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reminder Time</Label>
            <Input
              type="time"
              value={config.reminder_time || '09:00'}
              onChange={e => update({ reminder_time: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
      );

    case 'smart_linking':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Similarity Threshold ({Math.round((config.similarity_threshold || 0.7) * 100)}%)</Label>
            <Input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={config.similarity_threshold || 0.7}
              onChange={e => update({ similarity_threshold: parseFloat(e.target.value) })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Max Suggestions</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={config.max_suggestions || 5}
              onChange={e => update({ max_suggestions: parseInt(e.target.value) || 5 })}
              disabled={disabled}
            />
          </div>
        </div>
      );

    case 'content_summarizer':
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Auto-summarize Imports</Label>
            <Switch
              checked={config.auto_summarize_imports !== false}
              onCheckedChange={v => update({ auto_summarize_imports: v })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Summary Length</Label>
            <Select
              value={config.summary_length || 'medium'}
              onValueChange={v => update({ summary_length: v as 'short' | 'medium' | 'long' })}
              disabled={disabled}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="long">Long</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'writing_coach':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tone</Label>
            <Select
              value={config.tone || 'professional'}
              onValueChange={v => update({ tone: v as 'academic' | 'casual' | 'professional' })}
              disabled={disabled}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Check Grammar</Label>
            <Switch
              checked={config.check_grammar !== false}
              onCheckedChange={v => update({ check_grammar: v })}
              disabled={disabled}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Check Style</Label>
            <Switch
              checked={config.check_style !== false}
              onCheckedChange={v => update({ check_style: v })}
              disabled={disabled}
            />
          </div>
        </div>
      );

    case 'knowledge_gap':
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Analyze Cards</Label>
            <Switch
              checked={config.analyze_cards !== false}
              onCheckedChange={v => update({ analyze_cards: v })}
              disabled={disabled}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Analyze Notes</Label>
            <Switch
              checked={config.analyze_notes !== false}
              onCheckedChange={v => update({ analyze_notes: v })}
              disabled={disabled}
            />
          </div>
        </div>
      );

    case 'daily_digest':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Digest Time</Label>
            <Input
              type="time"
              value={config.digest_time || '08:00'}
              onChange={e => update({ digest_time: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Include Recommendations</Label>
            <Switch
              checked={config.include_recommendations !== false}
              onCheckedChange={v => update({ include_recommendations: v })}
              disabled={disabled}
            />
          </div>
        </div>
      );

    case 'citation':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Citation Style</Label>
            <Select
              value={config.citation_style || 'apa'}
              onValueChange={v => update({ citation_style: v as 'apa' | 'mla' | 'chicago' | 'harvard' })}
              disabled={disabled}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="apa">APA</SelectItem>
                <SelectItem value="mla">MLA</SelectItem>
                <SelectItem value="chicago">Chicago</SelectItem>
                <SelectItem value="harvard">Harvard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'task_extraction':
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Auto-create Tasks</Label>
            <Switch
              checked={config.auto_create_tasks !== false}
              onCheckedChange={v => update({ auto_create_tasks: v })}
              disabled={disabled}
            />
          </div>
        </div>
      );

    case 'spaced_repetition':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cards Per Session</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={config.cards_per_session || 10}
              onChange={e => update({ cards_per_session: parseInt(e.target.value) || 10 })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Difficulty Multiplier</Label>
            <Input
              type="number"
              min={1}
              max={5}
              step={0.1}
              value={config.difficulty_multiplier || 2.5}
              onChange={e => update({ difficulty_multiplier: parseFloat(e.target.value) || 2.5 })}
              disabled={disabled}
            />
          </div>
        </div>
      );

    case 'custom':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Custom Instructions</Label>
            <Textarea
              value={config.custom_instructions || ''}
              onChange={e => update({ custom_instructions: e.target.value })}
              placeholder="Describe what this agent should do, how it should behave, and what kind of results you expect..."
              rows={6}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              Write detailed instructions for your custom agent. Be specific about inputs, outputs, and behavior.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Input Source</Label>
            <Select
              value={config.custom_input_source || 'all'}
              onValueChange={v => update({ custom_input_source: v as any })}
              disabled={disabled}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Content</SelectItem>
                <SelectItem value="cards">Zettel Cards Only</SelectItem>
                <SelectItem value="notes">Notes Only</SelectItem>
                <SelectItem value="documents">Catalyst Documents Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Output Format</Label>
            <Select
              value={config.custom_output_format || 'findings'}
              onValueChange={v => update({ custom_output_format: v as any })}
              disabled={disabled}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="findings">Findings & Notifications</SelectItem>
                <SelectItem value="cards">Create Cards</SelectItem>
                <SelectItem value="notes">Create Notes</SelectItem>
                <SelectItem value="summary">Summary Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    default:
      return <p className="text-sm text-muted-foreground">No additional configuration available for this agent type.</p>;
  }
}
