-- Fix Supabase linter: rls_disabled_in_public, sensitive_columns_exposed (e.g. user_sessions.session_token).
--
-- MzansiBuilds serves data through FastAPI + SQLAlchemy using the database connection string
-- (postgres role bypasses RLS). These tables must not be readable/writable via PostgREST with
-- the anon or authenticated keys without explicit policies.
--
-- If you later use supabase-js to query public tables, add policies (e.g. match auth.uid() to
-- users.google_id where that column stores Supabase Auth sub).
--
-- Tables may be created outside Supabase migrations (e.g. SQLAlchemy on Railway). Only touch
-- relations that exist so preview DBs and partial schemas do not fail.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'login_attempts',
    'users',
    'user_sessions',
    'profiles',
    'projects',
    'project_updates',
    'milestones',
    'comments',
    'collaboration_requests'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format(
        'DROP POLICY IF EXISTS deny_direct_api_access ON public.%I',
        t
      );
      EXECUTE format(
        'CREATE POLICY deny_direct_api_access ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
        t
      );
    END IF;
  END LOOP;
END $$;
