import { useState, useCallback } from 'react';
import { useAgents } from '@/hooks/useAgents';
import { AgentsOverview } from '@/components/agents/AgentsOverview';
import { AgentDetail } from '@/components/agents/AgentDetail';
import { CreateAgentDialog } from '@/components/agents/CreateAgentDialog';
import { AgentPipelineBuilder, Pipeline, PipelineStep } from '@/components/agents/AgentPipelineBuilder';
import { useIsMobile } from '@/hooks/use-mobile';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bot, GitBranch, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import pendragonLogo from '@/assets/pendragon-logo.png';
import { toast } from 'sonner';

type AgentView = 'command-center' | 'pipelines';

export default function Agents() {
  const isMobile = useIsMobile();
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Compact header */}
      <header className="h-12 border-b bg-background/95 backdrop-blur sticky top-0 z-50 flex items-center px-4 gap-3">
        <Link to="/">
          <img src={pendragonLogo} alt="Pendragon" className="h-7 w-7" />
        </Link>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <Bot className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Command Center</span>
        </div>

        {/* Tab navigation */}
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

        <div className="flex-1" />
        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
          <Link to="/">
            <ArrowLeft className="h-3 w-3 mr-1" />
            Dashboard
          </Link>
        </Button>
      </header>

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
