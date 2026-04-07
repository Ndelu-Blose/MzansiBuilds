-- OAuth state hardening storage

CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_hash VARCHAR(128) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider connectedprovider NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_states_used_at ON oauth_states(used_at);

ALTER TABLE IF EXISTS oauth_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_direct_api_access ON oauth_states;
CREATE POLICY deny_direct_api_access ON oauth_states
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
