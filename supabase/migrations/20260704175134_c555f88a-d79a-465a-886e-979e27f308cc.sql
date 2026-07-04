
-- 1) SECURITY DEFINER view → INVOKER
ALTER VIEW public.macro_marketplace_public SET (security_invoker = true);

-- 2) Pin search_path on functions missing it
ALTER FUNCTION public.chat_messages_broadcast_on_insert() SET search_path = public;
ALTER FUNCTION public.set_chat_message_sender_display_name() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- 3) Revoke EXECUTE from anon on every public function (nothing anonymous should call these RPCs;
--    RLS helpers only run in authenticated policy evaluation).
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, PUBLIC;

-- 4) Revoke EXECUTE from authenticated on internal trigger / cron / edge-only functions.
--    These are never called as PostgREST RPCs by end-users.
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    '_handle_habit_missed()',
    'auto_delete_expired_items()',
    'chat_messages_broadcast_on_insert()',
    'cleanup_old_audit_logs()',
    'create_good_morning_summaries()',
    'enforce_shared_with_accepted_friend()',
    'handle_friend_request_accepted()',
    'handle_new_user()',
    'queue_synthesis_on_content_change()',
    'set_chat_message_sender_display_name()',
    'set_updated_at()',
    'update_profiles_updated_at()',
    'update_updated_at_column()',
    'zettel_cards_lock_on_user_link_change()',
    'calculate_next_execution(jsonb, timestamp with time zone)',
    'alice_set_auto_links(uuid, uuid[])',
    'alice_set_suggested_links(uuid, uuid[])',
    'match_alice_episodic_for_user(extensions.vector, integer, double precision)',
    'validate_password_strength(text)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      -- signature drift; skip
      NULL;
    END;
  END LOOP;
END $$;

-- 5) Tighten cookie_consent_analytics INSERT policy so anonymous callers cannot
--    inject arbitrary or user-linked rows. Session id must look like a nanoid/uuid
--    (length + charset guard), and if a user_id is supplied it must match auth.uid().
DROP POLICY IF EXISTS "Anyone can insert cookie consent with valid session"
  ON public.cookie_consent_analytics;

CREATE POLICY "Insert cookie consent with validated session"
ON public.cookie_consent_analytics
FOR INSERT
TO anon, authenticated
WITH CHECK (
  session_id IS NOT NULL
  AND char_length(session_id) BETWEEN 16 AND 128
  AND session_id ~ '^[A-Za-z0-9_-]+$'
  AND (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  )
);
