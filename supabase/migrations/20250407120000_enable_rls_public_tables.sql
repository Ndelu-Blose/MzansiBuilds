-- Fix Supabase linter: rls_disabled_in_public, sensitive_columns_exposed (e.g. user_sessions.session_token).
--
-- MzansiBuilds serves data through FastAPI + SQLAlchemy using the database connection string
-- (postgres role bypasses RLS). These tables must not be readable/writable via PostgREST with
-- the anon or authenticated keys without explicit policies.
--
-- If you later use supabase-js to query public tables, add policies (e.g. match auth.uid() to
-- users.google_id where that column stores Supabase Auth sub).

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;

-- Explicit deny for PostgREST roles (clearer than relying on "no policy" defaults).
DROP POLICY IF EXISTS "deny_direct_api_access" ON public.login_attempts;
CREATE POLICY "deny_direct_api_access" ON public.login_attempts FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_direct_api_access" ON public.users;
CREATE POLICY "deny_direct_api_access" ON public.users FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_direct_api_access" ON public.user_sessions;
CREATE POLICY "deny_direct_api_access" ON public.user_sessions FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_direct_api_access" ON public.profiles;
CREATE POLICY "deny_direct_api_access" ON public.profiles FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_direct_api_access" ON public.projects;
CREATE POLICY "deny_direct_api_access" ON public.projects FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_direct_api_access" ON public.project_updates;
CREATE POLICY "deny_direct_api_access" ON public.project_updates FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_direct_api_access" ON public.milestones;
CREATE POLICY "deny_direct_api_access" ON public.milestones FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_direct_api_access" ON public.comments;
CREATE POLICY "deny_direct_api_access" ON public.comments FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_direct_api_access" ON public.collaboration_requests;
CREATE POLICY "deny_direct_api_access" ON public.collaboration_requests FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
