-- Foundation for GitHub-backed projects

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'projecttype') THEN
    CREATE TYPE projecttype AS ENUM ('idea', 'repo_backed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verificationstatus') THEN
    CREATE TYPE verificationstatus AS ENUM ('verified_owner', 'verified_contributor', 'unverified', 'disconnected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ownershiptype') THEN
    CREATE TYPE ownershiptype AS ENUM ('owner', 'contributor', 'external', 'none');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connectedprovider') THEN
    CREATE TYPE connectedprovider AS ENUM ('github');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'repoprovider') THEN
    CREATE TYPE repoprovider AS ENUM ('github');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reposyncstatus') THEN
    CREATE TYPE reposyncstatus AS ENUM ('queued', 'running', 'completed', 'failed');
  END IF;
END $$;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS short_pitch TEXT,
  ADD COLUMN IF NOT EXISTS long_description TEXT,
  ADD COLUMN IF NOT EXISTS category VARCHAR(120),
  ADD COLUMN IF NOT EXISTS tags_json TEXT,
  ADD COLUMN IF NOT EXISTS looking_for_help BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS roles_needed_json TEXT,
  ADD COLUMN IF NOT EXISTS demo_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS problem_statement TEXT,
  ADD COLUMN IF NOT EXISTS roadmap_summary TEXT,
  ADD COLUMN IF NOT EXISTS project_type projecttype NOT NULL DEFAULT 'idea',
  ADD COLUMN IF NOT EXISTS verification_status verificationstatus NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS ownership_type ownershiptype NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS repo_connected BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider connectedprovider NOT NULL,
  provider_account_id BIGINT NOT NULL,
  provider_username VARCHAR(255) NOT NULL,
  provider_display_name VARCHAR(255),
  avatar_url TEXT,
  access_token_encrypted TEXT NOT NULL,
  token_scopes TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_connected_accounts_provider_pid
  ON connected_accounts (provider, provider_account_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id
  ON connected_accounts (user_id);

CREATE TABLE IF NOT EXISTS project_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  provider repoprovider NOT NULL,
  github_repo_id BIGINT NOT NULL,
  repo_name VARCHAR(255) NOT NULL,
  repo_full_name VARCHAR(255) NOT NULL,
  repo_url TEXT NOT NULL,
  owner_login VARCHAR(255) NOT NULL,
  owner_id BIGINT NOT NULL,
  default_branch VARCHAR(255),
  visibility VARCHAR(50),
  description TEXT,
  homepage_url TEXT,
  stars_count INTEGER NOT NULL DEFAULT 0,
  forks_count INTEGER NOT NULL DEFAULT 0,
  watchers_count INTEGER NOT NULL DEFAULT 0,
  open_issues_count INTEGER NOT NULL DEFAULT 0,
  language_primary VARCHAR(100),
  readme_preview TEXT,
  detected_frameworks_json TEXT,
  important_files_json TEXT,
  repo_created_at TIMESTAMPTZ,
  repo_updated_at TIMESTAMPTZ,
  repo_pushed_at TIMESTAMPTZ,
  last_commit_date TIMESTAMPTZ,
  contributors_count INTEGER NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  sync_status reposyncstatus NOT NULL DEFAULT 'queued',
  sync_error TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_repositories_provider_repo
  ON project_repositories (provider, github_repo_id);
CREATE INDEX IF NOT EXISTS idx_project_repositories_full_name
  ON project_repositories (repo_full_name);
