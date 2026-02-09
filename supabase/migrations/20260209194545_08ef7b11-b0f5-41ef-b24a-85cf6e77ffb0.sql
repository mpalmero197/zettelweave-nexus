
-- Fix agents table: drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Users can create their own agents" ON public.agents;
DROP POLICY IF EXISTS "Users can delete their own agents" ON public.agents;
DROP POLICY IF EXISTS "Users can update their own agents" ON public.agents;
DROP POLICY IF EXISTS "Users can view their own agents" ON public.agents;

CREATE POLICY "Users can view their own agents" ON public.agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own agents" ON public.agents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own agents" ON public.agents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own agents" ON public.agents FOR DELETE USING (auth.uid() = user_id);

-- Fix agent_runs table
DROP POLICY IF EXISTS "Users can create their own agent runs" ON public.agent_runs;
DROP POLICY IF EXISTS "Users can update their own agent runs" ON public.agent_runs;
DROP POLICY IF EXISTS "Users can view their own agent runs" ON public.agent_runs;

CREATE POLICY "Users can view their own agent runs" ON public.agent_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own agent runs" ON public.agent_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own agent runs" ON public.agent_runs FOR UPDATE USING (auth.uid() = user_id);

-- Fix agent_findings table
DROP POLICY IF EXISTS "Users can create their own findings" ON public.agent_findings;
DROP POLICY IF EXISTS "Users can delete their own findings" ON public.agent_findings;
DROP POLICY IF EXISTS "Users can update their own findings" ON public.agent_findings;
DROP POLICY IF EXISTS "Users can view their own findings" ON public.agent_findings;

CREATE POLICY "Users can view their own findings" ON public.agent_findings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own findings" ON public.agent_findings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own findings" ON public.agent_findings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own findings" ON public.agent_findings FOR DELETE USING (auth.uid() = user_id);

-- Fix agent_notifications table
DROP POLICY IF EXISTS "Users can create their own notifications" ON public.agent_notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.agent_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.agent_notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.agent_notifications;

CREATE POLICY "Users can view their own notifications" ON public.agent_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own notifications" ON public.agent_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.agent_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.agent_notifications FOR DELETE USING (auth.uid() = user_id);
