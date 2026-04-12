-- Phase 3: persist GitHub import audit metadata on projects (matches SQLAlchemy Project.import_provenance_json).
-- Safe when public.projects is missing (partial migration order); core schema is created in
-- 20240101000000_mzansibuilds_bootstrap_public_core.sql on fresh Supabase Preview.

DO $$
BEGIN
  IF to_regclass('public.projects') IS NOT NULL THEN
    ALTER TABLE public.projects
      ADD COLUMN IF NOT EXISTS import_provenance_json TEXT;

    COMMENT ON COLUMN public.projects.import_provenance_json IS
      'JSON snapshot for GitHub imports: source, github_repo_full_name, github_repo_id, imported_at, submitted_title/tags/stage/demo_url.';
  END IF;
END $$;
