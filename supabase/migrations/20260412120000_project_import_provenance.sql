-- Phase 3: persist GitHub import audit metadata on projects (matches SQLAlchemy Project.import_provenance_json).

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS import_provenance_json TEXT;

COMMENT ON COLUMN projects.import_provenance_json IS
  'JSON snapshot for GitHub imports: source, github_repo_full_name, github_repo_id, imported_at, submitted_title/tags/stage/demo_url.';
