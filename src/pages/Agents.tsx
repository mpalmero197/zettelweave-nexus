import { useState, useCallback } from 'react';
import { useAgents } from '@/hooks/useAgents';
import { AgentsOverview } from '@/components/agents/AgentsOverview';
import { AgentDetail } from '@/components/agents/AgentDetail';
import { CreateAgentDialog } from '@/components/agents/CreateAgentDialog';
import { AgentPipelineBuilder, Pipeline, PipelineStep } from '@/components/agents/AgentPipelineBuilder';
import { useIsMobile } from '@/hooks/use-mobile';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Bot, GitBranch, LayoutDashboard, Lock } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';

type AgentView = 'command-center' | 'pipelines';

export default function Agents() {
  const isMobile = useIsMobile();
  const { hasPremium } = useSubscription();
  const { agents, findings, notifications, unreadCount, loading, createAgent } = useAgents();
  const [currentView, setCurrentView] = useState<AgentView>('command-center');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  // Local pipeline state
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setTimeout(() => setSelectedAgentId(null), 300);
  };

  const handleCreatePipeline = useCallback(async (name: string, description: string, steps: Omit<PipelineStep, 'id'>[]) => {
    const pipeline: Pipeline = {
      id: crypto.randomUUID(),
      name,
      description,
      steps: steps.map(s => ({ ...s, id: crypto.randomUUID() })),
      is_enabled: true,
      created_at: new Date().toISOString(),
    };
    setPipelines(prev => [...prev, pipeline]);
    toast.success(`Pipeline "${name}" created`);
  }, []);

  const handleDeletePipeline = useCallback(async (pipelineId: string) => {
    setPipelines(prev => prev.filter(p => p.id !== pipelineId));
    toast.success('Pipeline deleted');
  }, []);

  const handleRunPipeline = useCallback(async (pipelineId: string) => {
    toast.info('Pipeline execution started');
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (!hasPremium) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Premium Feature</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          The Agent Command Center requires a premium subscription. Upgrade to unlock automated research, writing, and analysis agents.
        </p>
        <Button onClick={() => window.location.href = '/subscription'}>
          Upgrade to Premium
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Sub-header with view tabs */}
      <div className="border-b bg-background/95 backdrop-blur flex items-center px-4 py-2 gap-3">
        <div className="flex items-center gap-1.5">
          <Bot className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Command Center</span>
        </div>

        <div className="flex items-center gap-1 ml-4">
          <Button
            variant={currentView === 'command-center' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setCurrentView('command-center')}
          >
            <LayoutDashboard className="h-3 w-3 mr-1" />
            Overview
          </Button>
          <Button
            variant={currentView === 'pipelines' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setCurrentView('pipelines')}
          >
            <GitBranch className="h-3 w-3 mr-1" />
            Pipelines
          </Button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {currentView === 'command-center' && (
          <AgentsOverview
            agents={agents}
            findings={findings}
            notifications={notifications}
            onSelectAgent={handleSelectAgent}
            onCreateAgent={() => setShowCreateDialog(true)}
            selectedAgentId={selectedAgentId}
          />
        )}

        {currentView === 'pipelines' && (
          <div className="max-w-4xl mx-auto">
            <AgentPipelineBuilder
              agents={agents}
              pipelines={pipelines}
              onCreatePipeline={handleCreatePipeline}
              onDeletePipeline={handleDeletePipeline}
              onRunPipeline={handleRunPipeline}
            />
          </div>
        )}
      </main>

      {/* Agent Detail Sheet */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="sr-only">Agent Detail</SheetTitle>
          </SheetHeader>
          {selectedAgent && (
            <AgentDetail
              agent={selectedAgent}
              onBack={handleCloseDetail}
            />
          )}
        </SheetContent>
      </Sheet>

      <CreateAgentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        createAgent={createAgent}
      />
    </div>
  );
}
