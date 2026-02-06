-- Create agents table for storing agent configurations
CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  run_frequency_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_runs table for tracking agent execution history
CREATE TABLE public.agent_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  results JSONB,
  error_message TEXT,
  items_processed INTEGER DEFAULT 0,
  items_found INTEGER DEFAULT 0
);

-- Create agent_findings table for storing agent discoveries
CREATE TABLE public.agent_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  finding_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  action_taken BOOLEAN NOT NULL DEFAULT false,
  source_id TEXT,
  source_type TEXT,
  relevance_score NUMERIC(3,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_notifications table for user alerts
CREATE TABLE public.agent_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  finding_id UUID REFERENCES public.agent_findings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for agents
CREATE POLICY "Users can view their own agents" ON public.agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own agents" ON public.agents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own agents" ON public.agents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own agents" ON public.agents FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for agent_runs
CREATE POLICY "Users can view their own agent runs" ON public.agent_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own agent runs" ON public.agent_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own agent runs" ON public.agent_runs FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for agent_findings
CREATE POLICY "Users can view their own findings" ON public.agent_findings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own findings" ON public.agent_findings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own findings" ON public.agent_findings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own findings" ON public.agent_findings FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for agent_notifications
CREATE POLICY "Users can view their own notifications" ON public.agent_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own notifications" ON public.agent_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.agent_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.agent_notifications FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_agents_user_id ON public.agents(user_id);
CREATE INDEX idx_agents_next_run ON public.agents(next_run_at) WHERE is_enabled = true;
CREATE INDEX idx_agent_runs_agent_id ON public.agent_runs(agent_id);
CREATE INDEX idx_agent_runs_user_status ON public.agent_runs(user_id, status);
CREATE INDEX idx_agent_findings_agent_id ON public.agent_findings(agent_id);
CREATE INDEX idx_agent_findings_user_unread ON public.agent_findings(user_id) WHERE is_read = false;
CREATE INDEX idx_agent_notifications_user_unread ON public.agent_notifications(user_id) WHERE is_read = false;

-- Create trigger for updated_at on agents
CREATE TRIGGER update_agents_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();