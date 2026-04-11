-- Keep backend-only access model for new tables (only when each table exists).

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'connected_accounts',
    'project_repositories',
    'project_languages',
    'project_repo_snapshots',
    'project_contributors',
    'project_commits',
    'project_file_highlights',
    'repo_sync_jobs'
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
