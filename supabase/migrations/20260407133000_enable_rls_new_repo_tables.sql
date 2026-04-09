-- Keep backend-only access model for new tables

ALTER TABLE IF EXISTS connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_repo_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_file_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS repo_sync_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_direct_api_access ON connected_accounts;
DROP POLICY IF EXISTS deny_direct_api_access ON project_repositories;
DROP POLICY IF EXISTS deny_direct_api_access ON project_languages;
DROP POLICY IF EXISTS deny_direct_api_access ON project_repo_snapshots;
DROP POLICY IF EXISTS deny_direct_api_access ON project_contributors;
DROP POLICY IF EXISTS deny_direct_api_access ON project_commits;
DROP POLICY IF EXISTS deny_direct_api_access ON project_file_highlights;
DROP POLICY IF EXISTS deny_direct_api_access ON repo_sync_jobs;

CREATE POLICY deny_direct_api_access ON connected_accounts
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY deny_direct_api_access ON project_repositories
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY deny_direct_api_access ON project_languages
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY deny_direct_api_access ON project_repo_snapshots
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY deny_direct_api_access ON project_contributors
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY deny_direct_api_access ON project_commits
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY deny_direct_api_access ON project_file_highlights
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY deny_direct_api_access ON repo_sync_jobs
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
