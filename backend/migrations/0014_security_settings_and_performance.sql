-- Consolidate authentication/settings, remove active ad-reward schema values,
-- and add indexes used by the unified Worker. All timestamps written by the
-- application after this migration use UTC CURRENT_TIMESTAMP.

-- Administrator/local-account support.
ALTER TABLE users ADD COLUMN username TEXT;

UPDATE users
SET username = 'admin'
WHERE id = (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
  AND (username IS NULL OR username = '');

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_nocase
ON users(username COLLATE NOCASE)
WHERE username IS NOT NULL;

-- Domain deletion is intentionally soft so historical inboxes and messages
-- remain referentially intact.
ALTER TABLE domains ADD COLUMN deleted_at TIMESTAMP NULL;
CREATE INDEX IF NOT EXISTS idx_domains_available
ON domains(status, deleted_at, domain);

-- A user can keep a local password while linking GitHub. This avoids changing
-- users.provider and accidentally disabling password login.
CREATE TABLE oauth_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('github')),
  provider_user_id TEXT NOT NULL,
  provider_email TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(provider, provider_user_id),
  UNIQUE(user_id, provider)
);

INSERT OR IGNORE INTO oauth_accounts
  (user_id, provider, provider_user_id, provider_email, created_at, updated_at)
SELECT id, 'github', provider_id, email, created_at, updated_at
FROM users
WHERE provider = 'github' AND provider_id IS NOT NULL;

CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);

-- One operation id ties all statements in an atomic redeem batch to the usage
-- inserted by that request. Historical rows remain valid with NULL ids.
ALTER TABLE redeem_code_usages ADD COLUMN operation_id TEXT;
CREATE UNIQUE INDEX idx_redeem_code_usages_operation_id
ON redeem_code_usages(operation_id)
WHERE operation_id IS NOT NULL;

-- The 0003 migration historically renamed request_count to count in deployed
-- databases. Rebuild using only columns common to both variants and reset the
-- ephemeral counters.
ALTER TABLE rate_limits RENAME TO rate_limits_legacy_0014;
CREATE TABLE rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count >= 0),
  window_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(identifier, endpoint)
);
INSERT OR IGNORE INTO rate_limits (identifier, endpoint, request_count, window_start)
SELECT identifier, endpoint, 1, CURRENT_TIMESTAMP
FROM rate_limits_legacy_0014;
DROP TABLE rate_limits_legacy_0014;
CREATE INDEX idx_rate_limits_identifier_endpoint
ON rate_limits(identifier, endpoint);

-- quota balances are authoritative. Preserve previously granted ad quota by
-- classifying it as a historical administrative adjustment, while removing
-- ad_reward from all active constraints and APIs.
DROP TRIGGER IF EXISTS update_user_quota_after_log_insert;
DROP TRIGGER IF EXISTS update_user_quota_after_log_update;
DROP TRIGGER IF EXISTS update_user_quota_after_log_delete;

-- 0008 built balances from earn logs but did not apply consume logs. The
-- denormalized users.quota value is therefore the only reliable snapshot of
-- the available quota immediately before this migration. Keep it while the
-- balance and log tables are rebuilt, then reconcile active balances to it.
CREATE TABLE legacy_user_quota_0014 (
  user_id INTEGER PRIMARY KEY,
  available_quota INTEGER NOT NULL CHECK (available_quota >= 0)
);
INSERT INTO legacy_user_quota_0014 (user_id, available_quota)
SELECT
  users.id,
  MAX(0, CASE
    -- A legacy quota at or below active balances is authoritative: consume
    -- those active balances down to the snapshot.
    WHEN COALESCE(users.quota, 0) <= COALESCE(balances.active_amount, 0)
      THEN COALESCE(users.quota, 0)
    -- The portion between active and all balances can be explained entirely
    -- by expired grants and must never be revived as permanent quota.
    WHEN COALESCE(users.quota, 0) <=
      COALESCE(balances.active_amount, 0) + COALESCE(balances.expired_amount, 0)
      THEN COALESCE(balances.active_amount, 0)
    -- Only quota above every known active + expired balance is certainly an
    -- untracked historical adjustment and is safe to preserve.
    ELSE COALESCE(balances.active_amount, 0) + COALESCE(users.quota, 0)
      - COALESCE(balances.active_amount, 0) - COALESCE(balances.expired_amount, 0)
  END)
FROM users
LEFT JOIN (
  SELECT
    user_id,
    SUM(CASE WHEN expires_at IS NULL OR datetime(expires_at) > CURRENT_TIMESTAMP
      THEN MAX(amount, 0) ELSE 0 END) AS active_amount,
    SUM(CASE WHEN expires_at IS NOT NULL AND datetime(expires_at) <= CURRENT_TIMESTAMP
      THEN MAX(amount, 0) ELSE 0 END) AS expired_amount
  FROM user_quota_balances
  GROUP BY user_id
) balances ON balances.user_id = users.id;

CREATE TABLE user_quota_balances_0014 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  quota_type TEXT NOT NULL CHECK (quota_type IN ('permanent', 'daily', 'custom')),
  amount INTEGER NOT NULL DEFAULT 0 CHECK (amount >= 0),
  expires_at TIMESTAMP NULL,
  source TEXT NOT NULL CHECK (source IN ('register', 'checkin', 'redeem_code', 'admin_adjust')),
  source_id INTEGER NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO user_quota_balances_0014
  (id, user_id, quota_type, amount, expires_at, source, source_id, created_at, updated_at)
SELECT id, user_id, quota_type, MAX(amount, 0),
  CASE WHEN expires_at IS NULL THEN NULL ELSE datetime(expires_at) END,
  CASE WHEN source = 'ad_reward' THEN 'admin_adjust' ELSE source END,
  source_id, datetime(created_at), datetime(updated_at)
FROM user_quota_balances;

DROP TABLE user_quota_balances;
ALTER TABLE user_quota_balances_0014 RENAME TO user_quota_balances;
CREATE INDEX idx_user_quota_balances_user_expiry
ON user_quota_balances(user_id, expires_at, amount);
CREATE INDEX idx_user_quota_balances_source
ON user_quota_balances(source, created_at);

CREATE TABLE quota_logs_0014 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'consume')),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  source TEXT NOT NULL CHECK (source IN ('register', 'checkin', 'redeem_code', 'admin_adjust', 'create_email')),
  description TEXT,
  related_id INTEGER NULL,
  operation_id TEXT NULL,
  expires_at TIMESTAMP NULL,
  quota_type TEXT NOT NULL DEFAULT 'permanent' CHECK (quota_type IN ('permanent', 'daily', 'custom')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO quota_logs_0014
  (id, user_id, type, amount, source, description, related_id, expires_at, quota_type, created_at)
SELECT id, user_id, type, MAX(amount, 0),
  CASE WHEN source = 'ad_reward' THEN 'admin_adjust' ELSE source END,
  CASE WHEN source = 'ad_reward'
    THEN '历史活动额度（由旧广告奖励迁移）'
    ELSE description END,
  related_id,
  CASE WHEN expires_at IS NULL THEN NULL ELSE datetime(expires_at) END,
  COALESCE(quota_type, 'permanent'), datetime(created_at)
FROM quota_logs;

DROP TABLE quota_logs;
ALTER TABLE quota_logs_0014 RENAME TO quota_logs;
CREATE INDEX idx_quota_logs_user_created
ON quota_logs(user_id, created_at DESC);
CREATE INDEX idx_quota_logs_source_created
ON quota_logs(source, created_at DESC);
CREATE INDEX idx_quota_logs_type_created
ON quota_logs(type, created_at DESC);
CREATE UNIQUE INDEX idx_quota_logs_operation_id
ON quota_logs(operation_id)
WHERE operation_id IS NOT NULL;

-- Remove the balance amount that 0008 failed to consume. Deductions follow
-- the same expiry-first order as the application, preserving later-expiring
-- and permanent quota whenever possible.
WITH eligible AS (
  SELECT
    balances.id,
    balances.user_id,
    balances.amount,
    SUM(balances.amount) OVER (
      PARTITION BY balances.user_id
    ) AS total_amount,
    COALESCE(SUM(balances.amount) OVER (
      PARTITION BY balances.user_id
      ORDER BY
        CASE WHEN balances.expires_at IS NULL THEN 1 ELSE 0 END,
        datetime(balances.expires_at),
        balances.id
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ), 0) AS prior_amount
  FROM user_quota_balances balances
  WHERE balances.amount > 0
    AND (
      balances.expires_at IS NULL
      OR datetime(balances.expires_at) > CURRENT_TIMESTAMP
    )
), deductions AS (
  SELECT
    eligible.id,
    CASE
      WHEN eligible.total_amount <= legacy.available_quota THEN 0
      WHEN eligible.total_amount - legacy.available_quota <= eligible.prior_amount THEN 0
      WHEN eligible.total_amount - legacy.available_quota - eligible.prior_amount >= eligible.amount
        THEN eligible.amount
      ELSE eligible.total_amount - legacy.available_quota - eligible.prior_amount
    END AS deduction
  FROM eligible
  JOIN legacy_user_quota_0014 legacy ON legacy.user_id = eligible.user_id
)
UPDATE user_quota_balances
SET amount = amount - (
  SELECT deduction FROM deductions WHERE deductions.id = user_quota_balances.id
), updated_at = CURRENT_TIMESTAMP
WHERE id IN (SELECT id FROM deductions WHERE deduction > 0);

-- A legacy database may also contain quota that never received a balance row
-- (for example, a manual adjustment made before the balance system existed).
-- Record and restore only the missing amount, without reviving expired quota.
INSERT INTO quota_logs
  (user_id, type, amount, source, description, related_id, expires_at, quota_type, created_at)
SELECT
  legacy.user_id,
  'earn',
  legacy.available_quota - COALESCE(active.total_amount, 0),
  'admin_adjust',
  '历史可用配额校准（升级保留）',
  NULL,
  NULL,
  'permanent',
  CURRENT_TIMESTAMP
FROM legacy_user_quota_0014 legacy
LEFT JOIN (
  SELECT user_id, SUM(amount) AS total_amount
  FROM user_quota_balances
  WHERE amount > 0
    AND (expires_at IS NULL OR datetime(expires_at) > CURRENT_TIMESTAMP)
  GROUP BY user_id
) active ON active.user_id = legacy.user_id
WHERE COALESCE(active.total_amount, 0) < legacy.available_quota;

INSERT INTO user_quota_balances
  (user_id, quota_type, amount, expires_at, source, source_id, created_at, updated_at)
SELECT
  legacy.user_id,
  'permanent',
  legacy.available_quota - COALESCE(active.total_amount, 0),
  NULL,
  'admin_adjust',
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM legacy_user_quota_0014 legacy
LEFT JOIN (
  SELECT user_id, SUM(amount) AS total_amount
  FROM user_quota_balances
  WHERE amount > 0
    AND (expires_at IS NULL OR datetime(expires_at) > CURRENT_TIMESTAMP)
  GROUP BY user_id
) active ON active.user_id = legacy.user_id
WHERE COALESCE(active.total_amount, 0) < legacy.available_quota;

UPDATE users
SET quota = MAX(0, COALESCE((
  SELECT SUM(amount)
  FROM user_quota_balances balances
  WHERE balances.user_id = users.id
    AND balances.amount > 0
    AND (balances.expires_at IS NULL OR datetime(balances.expires_at) > CURRENT_TIMESTAMP)
), 0)),
updated_at = CURRENT_TIMESTAMP;

DROP TABLE legacy_user_quota_0014;

-- Dynamic settings. Secrets are encrypted by the Worker before later writes;
-- initial values are deliberately empty and features remain disabled.
INSERT INTO system_settings (setting_key, setting_value, description, created_at, updated_at)
VALUES
  ('default_user_quota', '5', '新用户默认配额', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('registration_enabled', 'true', '允许新用户注册', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('turnstile_enabled', 'false', '启用 Cloudflare Turnstile', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('turnstile_site_key', '', 'Cloudflare Turnstile Site Key', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('turnstile_secret_key', '', 'Cloudflare Turnstile Secret Key', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('turnstile_login_enabled', 'false', '登录时要求人机验证', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('turnstile_register_enabled', 'false', '注册时要求人机验证', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('turnstile_redeem_enabled', 'false', '使用兑换码时要求人机验证', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('turnstile_public_inbox_enabled', 'false', '首次访问公开收件箱时要求人机验证', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('github_oauth_enabled', 'false', '启用 GitHub 登录', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('github_client_id', '', 'GitHub OAuth Client ID', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('github_client_secret', '', 'GitHub OAuth Client Secret', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('github_callback_url', '', 'GitHub OAuth 回调地址；留空时使用当前站点', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('admin_username', 'admin', '主管理员登录账号', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('admin_password', '', '主管理员新密码（只写）', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(setting_key) DO NOTHING;

DELETE FROM system_settings WHERE setting_key = 'daily_checkin_quota';

-- Cover the hottest ownership, list, expiry, and cleanup queries.
CREATE INDEX IF NOT EXISTS idx_temp_emails_user_active_created
ON temp_emails(user_id, active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_temp_emails_domain
ON temp_emails(domain_id);
CREATE INDEX IF NOT EXISTS idx_emails_temp_received
ON emails(temp_email_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active_expiry
ON refresh_tokens(token_hash, is_revoked, expires_at);
CREATE INDEX IF NOT EXISTS idx_logs_action_timestamp
ON logs(action, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_redeem_codes_validity
ON redeem_codes(never_expires, valid_until, used_count, max_uses);
