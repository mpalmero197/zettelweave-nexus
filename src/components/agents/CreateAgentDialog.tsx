import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search,
  Bell,
  Link,
  FileText,
  Pencil,
  HelpCircle,
  Calendar,
  Quote,
  CheckSquare,
  Brain,
  Bot,
  ArrowRight,
  ArrowLeft,
  Wand2
} from 'lucide-react';
import { AgentType, AGENT_DEFINITIONS } from '@/types/agents';
import { AgentConfig } from '@/types/agents';

const AGENT_ICONS: Record<AgentType, React.ElementType> = {
  research: Search,
  habit_reminder: Bell,
  smart_linking: Link,
  content_summarizer: FileText,
  writing_coach: Pencil,
  knowledge_gap: HelpCircle,
  daily_digest: Calendar,
  citation: Quote,
  task_extraction: CheckSquare,
  spaced_repetition: Brain,
  card_synthesizer: FileText,
  custom: Wand2
};

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createAgent: (agentType: AgentType, name: string, description: string, config: AgentConfig, runFrequencyMinutes?: number) => Promise<any>;
}

export function CreateAgentDialog({ open, onOpenChange, createAgent }: CreateAgentDialogProps) {
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [selectedType, setSelectedType] = useState<AgentType | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('60');
  const [isCreating, setIsCreating] = useState(false);

  const selectedDefinition = AGENT_DEFINITIONS.find(d => d.type === selectedType);

  const handleSelectType = (type: AgentType) => {
    setSelectedType(type);
    const definition = AGENT_DEFINITIONS.find(d => d.type === type);
    if (definition) {
      setName(definition.name);
      setDescription(definition.description);
    }
    setStep('configure');
  };

  const handleCreate = async () => {
    if (!selectedType || !name) return;
    
    setIsCreating(true);
    const definition = AGENT_DEFINITIONS.find(d => d.type === selectedType);
    
    await createAgent(
      selectedType,
      name,
      description,
      definition?.defaultConfig || {},
      parseInt(frequency)
    );
    
    setIsCreating(false);
    handleClose();
  };

  const handleClose = () => {
    setStep('select');
    setSelectedType(null);
    setName('');
    setDescription('');
    setFrequency('60');
    onOpenChange(false);
  };

  const handleBack = () => {
    setStep('select');
    setSelectedType(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {step === 'select' ? 'Create New Agent' : 'Configure Agent'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' 
              ? 'Choose the type of agent you want to create'
              : 'Customize your agent settings'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <ScrollArea className="h-[500px] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AGENT_DEFINITIONS.map(definition => {
                const Icon = AGENT_ICONS[definition.type] || Bot;
                
                return (
                  <Card 
                    key={definition.type}
                    className="p-4 cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleSelectType(definition.type)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{definition.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {definition.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {definition.capabilities.slice(0, 2).map(cap => (
                            <Badge key={cap} variant="outline" className="text-xs">
                              {cap}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="space-y-4">
            {selectedDefinition && (
              <Card className="p-4 bg-muted/50">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = AGENT_ICONS[selectedDefinition.type] || Bot;
                    return (
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    );
                  })()}
                  <div>
                    <p className="font-medium">{selectedDefinition.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedDefinition.capabilities.join(' • ')}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Research Agent"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What should this agent do?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Run Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Every hour</SelectItem>
                  <SelectItem value="180">Every 3 hours</SelectItem>
                  <SelectItem value="360">Every 6 hours</SelectItem>
                  <SelectItem value="720">Every 12 hours</SelectItem>
                  <SelectItem value="1440">Once daily</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleCreate}
                disabled={!name || isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Agent'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
