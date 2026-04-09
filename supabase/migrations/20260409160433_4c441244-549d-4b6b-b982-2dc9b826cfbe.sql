
-- Push subscription storage for Web Push API
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Reminders table
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL, -- 'event', 'task', 'habit', 'entry', 'note'
  item_id TEXT NOT NULL,
  item_title TEXT NOT NULL DEFAULT '',
  offset_minutes INTEGER NOT NULL DEFAULT 60,
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
  ON public.reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reminders"
  ON public.reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
  ON public.reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
  ON public.reminders FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_reminders_remind_at ON public.reminders (remind_at) WHERE is_sent = false;
CREATE INDEX idx_reminders_user_item ON public.reminders (user_id, item_type, item_id);

-- In-app notifications
CREATE TABLE public.in_app_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  item_type TEXT,
  item_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.in_app_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.in_app_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON public.in_app_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.in_app_notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Allow service_role to manage reminders (for the edge function)
CREATE POLICY "Service role can manage reminders"
  ON public.reminders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage notifications"
  ON public.in_app_notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can read subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO service_role
  USING (true);
