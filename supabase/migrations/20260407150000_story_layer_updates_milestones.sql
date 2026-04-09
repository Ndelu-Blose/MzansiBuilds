-- Build-in-public story layer: updates and milestones shape

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'projectupdatetype') THEN
    CREATE TYPE projectupdatetype AS ENUM ('progress', 'milestone', 'blocker', 'learning', 'release');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'milestonestatus') THEN
    CREATE TYPE milestonestatus AS ENUM ('planned', 'active', 'done', 'dropped');
  END IF;
END $$;

ALTER TABLE project_updates
  ADD COLUMN IF NOT EXISTS author_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS update_type projectupdatetype,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE project_updates
SET
  author_user_id = COALESCE(author_user_id, p.user_id),
  title = COALESCE(title, 'Project update'),
  body = COALESCE(body, content),
  update_type = COALESCE(update_type, 'progress'::projectupdatetype)
FROM projects p
WHERE p.id = project_updates.project_id;

ALTER TABLE project_updates
  ALTER COLUMN author_user_id SET NOT NULL,
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN body SET NOT NULL,
  ALTER COLUMN update_type SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_updates_author_user_id ON project_updates(author_user_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_update_type ON project_updates(update_type);

ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS status milestonestatus NOT NULL DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE milestones m
SET
  created_by_user_id = COALESCE(created_by_user_id, p.user_id),
  status = CASE WHEN m.is_completed THEN 'done'::milestonestatus ELSE COALESCE(m.status, 'planned'::milestonestatus) END,
  completed_at = CASE WHEN m.is_completed AND m.completed_at IS NULL THEN m.created_at ELSE m.completed_at END
FROM projects p
WHERE p.id = m.project_id;

ALTER TABLE milestones
  ALTER COLUMN created_by_user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_created_by_user_id ON milestones(created_by_user_id);
