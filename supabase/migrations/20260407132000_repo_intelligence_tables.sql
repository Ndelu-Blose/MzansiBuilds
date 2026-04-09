-- Repo intelligence tables for sync and activity

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contributorrole') THEN
    CREATE TYPE contributorrole AS ENUM ('owner', 'maintainer', 'collaborator', 'contributor');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS project_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_repository_id UUID NOT NULL REFERENCES project_repositories(id) ON DELETE CASCADE,
  language_name VARCHAR(100) NOT NULL,
  bytes INTEGER NOT NULL DEFAULT 0,
  percentage INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_project_languages_repo_id ON project_languages(project_repository_id);

CREATE TABLE IF NOT EXISTS project_repo_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_repository_id UUID NOT NULL REFERENCES project_repositories(id) ON DELETE CASCADE,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stars_count INTEGER NOT NULL DEFAULT 0,
  forks_count INTEGER NOT NULL DEFAULT 0,
  open_issues_count INTEGER NOT NULL DEFAULT 0,
  contributors_count INTEGER NOT NULL DEFAULT 0,
  commits_count INTEGER NOT NULL DEFAULT 0,
  last_commit_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_project_repo_snapshots_repo_id ON project_repo_snapshots(project_repository_id);
CREATE INDEX IF NOT EXISTS idx_project_repo_snapshots_captured_at ON project_repo_snapshots(captured_at DESC);

CREATE TABLE IF NOT EXISTS project_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  github_user_id BIGINT,
  github_username VARCHAR(255),
  display_name VARCHAR(255),
  avatar_url TEXT,
  role contributorrole NOT NULL DEFAULT 'contributor',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_contributors_project_id ON project_contributors(project_id);

CREATE TABLE IF NOT EXISTS project_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_repository_id UUID NOT NULL REFERENCES project_repositories(id) ON DELETE CASCADE,
  commit_sha VARCHAR(64) NOT NULL,
  author_github_id BIGINT,
  author_login VARCHAR(255),
  author_name VARCHAR(255),
  message_headline TEXT,
  message_body TEXT,
  committed_at TIMESTAMPTZ,
  commit_url TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_commits_repo_sha
  ON project_commits(project_repository_id, commit_sha);
CREATE INDEX IF NOT EXISTS idx_project_commits_project_id ON project_commits(project_id);

CREATE TABLE IF NOT EXISTS project_file_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_repository_id UUID NOT NULL REFERENCES project_repositories(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  item_type VARCHAR(20) NOT NULL,
  is_key_file BOOLEAN NOT NULL DEFAULT FALSE,
  classification VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_project_file_highlights_repo_id ON project_file_highlights(project_repository_id);

CREATE TABLE IF NOT EXISTS repo_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_repository_id UUID NOT NULL REFERENCES project_repositories(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL,
  status reposyncstatus NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  metadata_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_repo_sync_jobs_repo_id ON repo_sync_jobs(project_repository_id);
