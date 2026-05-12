
-- 1. alice_scheduled_triggers
CREATE TABLE public.alice_scheduled_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cron_expression TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  tool_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alice_scheduled_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_select_ast" ON public.alice_scheduled_triggers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert_ast" ON public.alice_scheduled_triggers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update_ast" ON public.alice_scheduled_triggers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owner_delete_ast" ON public.alice_scheduled_triggers FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_ast_due ON public.alice_scheduled_triggers (next_run_at) WHERE enabled = true;
CREATE TRIGGER trg_ast_updated BEFORE UPDATE ON public.alice_scheduled_triggers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. browser_tab_snapshots
CREATE TABLE public.browser_tab_snapshots (
  user_id UUID PRIMARY KEY,
  tabs JSONB NOT NULL DEFAULT '[]'::jsonb,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.browser_tab_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_select_bts" ON public.browser_tab_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert_bts" ON public.browser_tab_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update_bts" ON public.browser_tab_snapshots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owner_delete_bts" ON public.browser_tab_snapshots FOR DELETE USING (auth.uid() = user_id);

-- 3. browser_tab_privacy
CREATE TABLE public.browser_tab_privacy (
  user_id UUID PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  mode TEXT NOT NULL DEFAULT 'all' CHECK (mode IN ('all','whitelist','blacklist')),
  domains TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.browser_tab_privacy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_select_btp" ON public.browser_tab_privacy FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert_btp" ON public.browser_tab_privacy FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update_btp" ON public.browser_tab_privacy FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owner_delete_btp" ON public.browser_tab_privacy FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_btp_updated BEFORE UPDATE ON public.browser_tab_privacy FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. profiles flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS habit_recovery_enabled BOOLEAN NOT NULL DEFAULT true;

-- 5. update _handle_habit_missed
CREATE OR REPLACE FUNCTION public._handle_habit_missed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  next_day date := ((now() at time zone 'UTC')::date + interval '1 day')::date;
  recovery_task_id uuid;
  recovery_item_id text;
  v_recovery_enabled boolean;
  v_habit_name text;
begin
  -- Respect user setting
  select coalesce(p.habit_recovery_enabled, true)
    into v_recovery_enabled
    from public.profiles p
    where p.user_id = NEW.user_id;

  if v_recovery_enabled is false then
    return NEW;
  end if;

  -- Try to resolve a friendly habit name (best effort; falls back to id)
  begin
    execute 'select name from public.habits where id = $1'
      into v_habit_name
      using NEW.habit_id;
  exception when others then
    v_habit_name := null;
  end;

  if v_habit_name is null or btrim(v_habit_name) = '' then
    v_habit_name := NEW.habit_id::text;
  end if;

  recovery_item_id := format('habit_recovery:%s:%s:%s', NEW.user_id::text, NEW.habit_id, next_day::text);

  if exists (
    select 1
    from public.in_app_notifications n
    where n.user_id = NEW.user_id
      and n.item_type = 'project_task'
      and n.item_id = recovery_item_id
  ) then
    return NEW;
  end if;

  insert into public.project_tasks (
    user_id, name, status, priority, due_date, notes, repeat_type, repeat_until
  ) values (
    NEW.user_id,
    'Catch up on habit: ' || v_habit_name,
    'todo',
    'medium',
    next_day,
    jsonb_build_object(
      'source_event', NEW.id,
      'habit_id', NEW.habit_id,
      'habit_name', v_habit_name,
      'recovery_for_date', next_day
    )::text,
    'none',
    null
  ) returning id into recovery_task_id;

  insert into public.in_app_notifications (
    user_id, title, body, item_type, item_id, is_read
  ) values (
    NEW.user_id,
    '🧠 Habit recovery',
    'Quick plan to get back on track tomorrow.',
    'project_task',
    recovery_item_id,
    false
  );

  return NEW;
end;
$function$;
