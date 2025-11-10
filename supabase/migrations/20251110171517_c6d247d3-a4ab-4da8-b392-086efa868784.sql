-- Create enum for workflow types
CREATE TYPE workflow_type AS ENUM ('monitor_topic', 'periodic_search', 'keyword_alert');

-- Create enum for workflow status
CREATE TYPE workflow_status AS ENUM ('active', 'paused', 'completed', 'failed');

-- Create workflows table
CREATE TABLE public.workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  workflow_type workflow_type NOT NULL DEFAULT 'monitor_topic',
  status workflow_status NOT NULL DEFAULT 'active',
  
  -- Workflow configuration
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Execution tracking
  last_executed_at TIMESTAMP WITH TIME ZONE,
  next_execution_at TIMESTAMP WITH TIME ZONE,
  execution_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_config CHECK (jsonb_typeof(config) = 'object')
);

-- Create workflow executions table to track history
CREATE TABLE public.workflow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  status workflow_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Results
  results_count INTEGER DEFAULT 0,
  results JSONB DEFAULT '[]'::jsonb,
  
  -- Error handling
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workflow results table to store individual findings
CREATE TABLE public.workflow_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Auto-save destination
  saved_to_notebook_id UUID REFERENCES public.notebooks(id) ON DELETE SET NULL,
  saved_as_card_id UUID REFERENCES public.zettel_cards(id) ON DELETE SET NULL,
  saved_as_note_id UUID REFERENCES public.notes(id) ON DELETE SET NULL,
  
  relevance_score FLOAT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_results ENABLE ROW LEVEL SECURITY;

-- Workflows policies
CREATE POLICY "Users can view their own workflows"
  ON public.workflows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workflows"
  ON public.workflows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows"
  ON public.workflows FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows"
  ON public.workflows FOR DELETE
  USING (auth.uid() = user_id);

-- Workflow executions policies
CREATE POLICY "Users can view their own workflow executions"
  ON public.workflow_executions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create workflow executions"
  ON public.workflow_executions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update workflow executions"
  ON public.workflow_executions FOR UPDATE
  USING (true);

-- Workflow results policies
CREATE POLICY "Users can view their own workflow results"
  ON public.workflow_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create workflow results"
  ON public.workflow_results FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their workflow results"
  ON public.workflow_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their workflow results"
  ON public.workflow_results FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_workflows_user_id ON public.workflows(user_id);
CREATE INDEX idx_workflows_status ON public.workflows(status);
CREATE INDEX idx_workflows_next_execution ON public.workflows(next_execution_at) WHERE status = 'active';

CREATE INDEX idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_user_id ON public.workflow_executions(user_id);

CREATE INDEX idx_workflow_results_workflow_id ON public.workflow_results(workflow_id);
CREATE INDEX idx_workflow_results_execution_id ON public.workflow_results(execution_id);
CREATE INDEX idx_workflow_results_user_id ON public.workflow_results(user_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate next execution time
CREATE OR REPLACE FUNCTION calculate_next_execution(workflow_config JSONB, base_time TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
AS $$
DECLARE
  frequency TEXT;
  next_time TIMESTAMP WITH TIME ZONE;
BEGIN
  frequency := workflow_config->>'frequency';
  
  CASE frequency
    WHEN 'hourly' THEN
      next_time := base_time + INTERVAL '1 hour';
    WHEN 'daily' THEN
      next_time := base_time + INTERVAL '1 day';
    WHEN 'weekly' THEN
      next_time := base_time + INTERVAL '7 days';
    WHEN 'monthly' THEN
      next_time := base_time + INTERVAL '30 days';
    ELSE
      next_time := base_time + INTERVAL '1 day';
  END CASE;
  
  RETURN next_time;
END;
$$;