import { useState, useCallback } from 'react';
import { useAgents } from '@/hooks/useAgents';
import { AgentsSidebar } from '@/components/agents/AgentsSidebar';
import { AgentsOverview } from '@/components/agents/AgentsOverview';
import { AgentDetail } from '@/components/agents/AgentDetail';
import { AgentFindings } from '@/components/agents/AgentFindings';
import { AgentNotifications } from '@/components/agents/AgentNotifications';
import { CreateAgentDialog } from '@/components/agents/CreateAgentDialog';
import { AgentPipelineBuilder, Pipeline, PipelineStep } from '@/components/agents/AgentPipelineBuilder';
import { useIsMobile } from '@/hooks/use-mobile';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';
import pendragonLogo from '@/assets/pendragon-logo.png';
import { toast } from 'sonner';

type AgentView = 'overview' | 'detail' | 'findings' | 'notifications' | 'pipelines';

export default function Agents() {
  const isMobile = useIsMobile();
  const { agents, findings, notifications, unreadCount, loading } = useAgents();
  const [currentView, setCurrentView] = useState<AgentView>('overview');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Local pipeline state (stored in-memory; could be persisted to DB later)
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    setCurrentView('detail');
  };

  const handleBack = () => {
    setSelectedAgentId(null);
    setCurrentView('overview');
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
    toast.info('Pipeline execution started (sequential agent runs)');
    // In a full implementation, this would trigger sequential agent runs
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
      <header className="h-12 border-b bg-background/95 backdrop-blur sticky top-0 z-50 flex items-center px-4 gap-4">
        <Link to="/">
          <img src={pendragonLogo} alt="Pendragon" className="h-8 w-8" />
        </Link>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-semibold">Agents</span>
        </div>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {!isMobile && (
          <AgentsSidebar
            agents={agents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={handleSelectAgent}
            onCreateAgent={() => setShowCreateDialog(true)}
            currentView={currentView}
            onViewChange={setCurrentView as any}
            unreadNotifications={unreadCount}
            unreadFindings={findings.filter(f => !f.is_read).length}
          />
        )}
          
        <main className="flex-1 overflow-y-auto p-6">
          {currentView === 'overview' && (
            <AgentsOverview
              agents={agents}
              onSelectAgent={handleSelectAgent}
              onCreateAgent={() => setShowCreateDialog(true)}
            />
          )}
          
          {currentView === 'detail' && selectedAgent && (
            <AgentDetail
              agent={selectedAgent}
              onBack={handleBack}
            />
          )}
          
          {currentView === 'findings' && (
            <AgentFindings
              findings={findings}
              agents={agents}
            />
          )}
          
          {currentView === 'notifications' && (
            <AgentNotifications
              notifications={notifications}
              agents={agents}
            />
          )}

          {currentView === 'pipelines' && (
            <AgentPipelineBuilder
              agents={agents}
              pipelines={pipelines}
              onCreatePipeline={handleCreatePipeline}
              onDeletePipeline={handleDeletePipeline}
              onRunPipeline={handleRunPipeline}
            />
          )}
        </main>
      </div>

      <CreateAgentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}
