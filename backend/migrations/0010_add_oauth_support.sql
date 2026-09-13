-- Add third-party account metadata without rebuilding users. Rebuilding this
-- parent table can cascade-delete inbox and audit data when foreign keys are
-- enabled by D1.
ALTER TABLE users ADD COLUMN provider TEXT NOT NULL DEFAULT 'email'
  CHECK (provider IN ('email', 'github'));
ALTER TABLE users ADD COLUMN provider_id TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN display_name TEXT;

UPDATE users SET provider = 'email' WHERE provider IS NULL OR provider = '';

-- Fresh databases keep the original NOT NULL password_hash column. OAuth-only
-- accounts store an empty hash; application authentication treats it as no
-- local password. Databases that applied the historical rebuild remain
-- compatible and may contain NULL instead.
CREATE UNIQUE INDEX idx_users_provider_id
ON users(provider, provider_id)
WHERE provider_id IS NOT NULL;
