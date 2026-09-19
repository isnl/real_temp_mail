-- 临时邮箱管理系统：全新部署数据库结构（仅用于空 D1 数据库）。
-- 执行：npm run db:init / npm run db:init:local
-- 包含全部表、索引、触发器与迁移基线；后续升级使用 npm run db:migrate。
-- 不包含账户、域名、密钥或业务数据。管理员通过初始化接口创建，域名在后台添加。
-- 系统名称、价格与其他设置使用服务端默认值，首次保存后写入 system_settings。
-- 自动生成：python3 backend/scripts/build-init-sql.py；不要直接修改此文件。

-- 空库保护：拒绝覆盖已有应用表或已有迁移记录的数据库。
CREATE TABLE _fresh_install_guard (
  valid INTEGER NOT NULL CONSTRAINT fresh_install_requires_empty_database CHECK (valid = 1)
);
INSERT INTO _fresh_install_guard (valid)
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM sqlite_master
  WHERE type IN ('table', 'view')
    AND name NOT IN ('_fresh_install_guard', 'd1_migrations')
    AND name NOT GLOB 'sqlite_*'
    AND name NOT GLOB '_cf_*'
) THEN 0 ELSE 1 END;

CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO _fresh_install_guard (valid)
SELECT CASE WHEN EXISTS (SELECT 1 FROM d1_migrations) THEN 0 ELSE 1 END;

-- 业务表

CREATE TABLE announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  is_active BOOLEAN DEFAULT 1,
  priority INTEGER DEFAULT 0, -- 优先级，数字越大优先级越高
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT UNIQUE NOT NULL,
  status INTEGER DEFAULT 1 CHECK (status IN (0, 1)),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
, deleted_at TIMESTAMP NULL);

CREATE TABLE email_delivery_dedup (
  temp_email_id INTEGER NOT NULL,
  dedup_key TEXT NOT NULL,
  operation_id TEXT NOT NULL UNIQUE,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (temp_email_id, dedup_key),
  FOREIGN KEY (temp_email_id) REFERENCES temp_emails(id) ON DELETE CASCADE
);

CREATE TABLE emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  temp_email_id INTEGER NOT NULL,
  sender TEXT NOT NULL,
  subject TEXT,
  content TEXT,
  html_content TEXT,
  verification_code TEXT,
  is_read BOOLEAN DEFAULT 0,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, dedup_key TEXT NULL,
  FOREIGN KEY (temp_email_id) REFERENCES temp_emails(id) ON DELETE CASCADE
);

CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

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

CREATE TABLE "quota_logs" (
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

CREATE TABLE rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count >= 0),
  window_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(identifier, endpoint)
);

CREATE TABLE "redeem_code_usages" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  redeem_code_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  quota_amount INTEGER NOT NULL CHECK (quota_amount >= 0),
  operation_id TEXT,
  used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (redeem_code_id) REFERENCES "redeem_codes"(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(redeem_code_id, user_id)
);

CREATE TABLE "redeem_codes" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  quota INTEGER NOT NULL CHECK (quota >= 0),
  name TEXT,
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  never_expires INTEGER NOT NULL DEFAULT 0 CHECK (never_expires IN (0, 1)),
  used INTEGER NOT NULL DEFAULT 0 CHECK (used IN (0, 1)),
  used_by INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP,
  valid_until TIMESTAMP,
  FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_revoked BOOLEAN DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE temp_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  email TEXT UNIQUE NOT NULL,
  domain_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT 1, public_inbox_enabled BOOLEAN DEFAULT 0, creation_key TEXT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);

CREATE TABLE user_announcement_reads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  announcement_id INTEGER NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  UNIQUE(user_id, announcement_id)
);

CREATE TABLE user_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  checkin_date DATE NOT NULL,
  quota_reward INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, checkin_date)
);

CREATE TABLE "user_quota_balances" (
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

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  quota INTEGER DEFAULT 5,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
, email_verified BOOLEAN DEFAULT 0, email_verified_at TIMESTAMP NULL, provider TEXT NOT NULL DEFAULT 'email'
  CHECK (provider IN ('email', 'github')), provider_id TEXT, avatar_url TEXT, display_name TEXT, username TEXT);

-- 索引

CREATE INDEX idx_announcements_created_at ON announcements(created_at);

CREATE INDEX idx_announcements_is_active ON announcements(is_active);

CREATE INDEX idx_announcements_priority ON announcements(priority);

CREATE INDEX idx_announcements_type ON announcements(type);

CREATE INDEX idx_domains_available
ON domains(status, deleted_at, domain);

CREATE INDEX idx_email_delivery_dedup_received
ON email_delivery_dedup(received_at);

CREATE INDEX idx_emails_received_at ON emails(received_at);

CREATE UNIQUE INDEX idx_emails_temp_dedup_key
ON emails(temp_email_id, dedup_key)
WHERE dedup_key IS NOT NULL;

CREATE INDEX idx_emails_temp_email_id ON emails(temp_email_id);

CREATE INDEX idx_emails_temp_received
ON emails(temp_email_id, received_at DESC);

CREATE INDEX idx_logs_action_timestamp
ON logs(action, timestamp DESC);

CREATE INDEX idx_logs_timestamp ON logs(timestamp);

CREATE INDEX idx_logs_user_id ON logs(user_id);

CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);

CREATE UNIQUE INDEX idx_quota_logs_operation_id
ON quota_logs(operation_id)
WHERE operation_id IS NOT NULL;

CREATE INDEX idx_quota_logs_source_created
ON quota_logs(source, created_at DESC);

CREATE INDEX idx_quota_logs_type_created
ON quota_logs(type, created_at DESC);

CREATE INDEX idx_quota_logs_user_created
ON quota_logs(user_id, created_at DESC);

CREATE INDEX idx_rate_limits_identifier_endpoint
ON rate_limits(identifier, endpoint);

CREATE INDEX idx_rate_limits_window_start
ON rate_limits(window_start);

CREATE INDEX idx_redeem_code_usages_code_id ON redeem_code_usages(redeem_code_id);

CREATE UNIQUE INDEX idx_redeem_code_usages_operation_id
ON redeem_code_usages(operation_id)
WHERE operation_id IS NOT NULL;

CREATE INDEX idx_redeem_code_usages_used_at ON redeem_code_usages(used_at);

CREATE INDEX idx_redeem_code_usages_user_id ON redeem_code_usages(user_id);

CREATE INDEX idx_redeem_codes_name ON redeem_codes(name);

CREATE INDEX idx_redeem_codes_valid_until ON redeem_codes(valid_until);

CREATE INDEX idx_redeem_codes_validity
ON redeem_codes(never_expires, valid_until, used_count, max_uses);

CREATE INDEX idx_refresh_tokens_active_expiry
ON refresh_tokens(token_hash, is_revoked, expires_at);

CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

CREATE INDEX idx_system_settings_key ON system_settings(setting_key);

CREATE UNIQUE INDEX idx_temp_emails_creation_key
ON temp_emails(creation_key)
WHERE creation_key IS NOT NULL;

CREATE INDEX idx_temp_emails_domain
ON temp_emails(domain_id);

CREATE INDEX idx_temp_emails_email ON temp_emails(email);

CREATE INDEX idx_temp_emails_email_nocase
ON temp_emails(email COLLATE NOCASE);

CREATE INDEX idx_temp_emails_public_inbox
ON temp_emails(email, active, public_inbox_enabled);

CREATE INDEX idx_temp_emails_user_active_created
ON temp_emails(user_id, active, created_at DESC);

CREATE INDEX idx_temp_emails_user_id ON temp_emails(user_id);

CREATE INDEX idx_user_announcement_reads_announcement_id ON user_announcement_reads(announcement_id);

CREATE INDEX idx_user_announcement_reads_read_at ON user_announcement_reads(read_at);

CREATE INDEX idx_user_announcement_reads_user_id ON user_announcement_reads(user_id);

CREATE INDEX idx_user_checkins_date ON user_checkins(checkin_date);

CREATE INDEX idx_user_checkins_user_id ON user_checkins(user_id);

CREATE INDEX idx_user_quota_balances_source
ON user_quota_balances(source, created_at);

CREATE INDEX idx_user_quota_balances_user_expiry
ON user_quota_balances(user_id, expires_at, amount);

CREATE INDEX idx_users_email ON users(email);

CREATE UNIQUE INDEX idx_users_provider_id
ON users(provider, provider_id)
WHERE provider_id IS NOT NULL;

CREATE UNIQUE INDEX idx_users_username_nocase
ON users(username COLLATE NOCASE)
WHERE username IS NOT NULL;

-- 触发器

CREATE TRIGGER normalize_announcement_reads_insert_utc_0016
AFTER INSERT ON user_announcement_reads
WHEN ABS((julianday(NEW.read_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE user_announcement_reads SET read_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER normalize_announcements_insert_utc_0016
AFTER INSERT ON announcements
WHEN ABS((julianday(NEW.created_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
  OR ABS((julianday(NEW.updated_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE announcements SET
    created_at = CASE
      WHEN ABS((julianday(NEW.created_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
        THEN CURRENT_TIMESTAMP ELSE NEW.created_at END,
    updated_at = CASE
      WHEN ABS((julianday(NEW.updated_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
        THEN CURRENT_TIMESTAMP ELSE NEW.updated_at END
  WHERE id = NEW.id;
END;

CREATE TRIGGER normalize_checkins_insert_utc_0016
AFTER INSERT ON user_checkins
WHEN ABS((julianday(NEW.created_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE user_checkins SET created_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER normalize_domains_insert_utc_0016
AFTER INSERT ON domains
WHEN ABS((julianday(NEW.created_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE domains SET created_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER normalize_emails_insert_utc_0016
AFTER INSERT ON emails
WHEN ABS((julianday(NEW.received_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE emails SET received_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER normalize_logs_insert_utc_0016
AFTER INSERT ON logs
WHEN ABS((julianday(NEW.timestamp) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE logs SET timestamp = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER normalize_redeem_codes_insert_utc_0016
AFTER INSERT ON redeem_codes
WHEN ABS((julianday(NEW.created_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE redeem_codes SET created_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER normalize_redeem_usage_insert_utc_0016
AFTER INSERT ON redeem_code_usages
WHEN ABS((julianday(NEW.used_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE redeem_code_usages SET used_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER normalize_refresh_tokens_insert_utc_0016
AFTER INSERT ON refresh_tokens
WHEN ABS((julianday(NEW.created_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE refresh_tokens SET created_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER normalize_settings_insert_utc_0016
AFTER INSERT ON system_settings
WHEN ABS((julianday(NEW.created_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
  OR ABS((julianday(NEW.updated_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE system_settings SET
    created_at = CASE
      WHEN ABS((julianday(NEW.created_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
        THEN CURRENT_TIMESTAMP ELSE NEW.created_at END,
    updated_at = CASE
      WHEN ABS((julianday(NEW.updated_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
        THEN CURRENT_TIMESTAMP ELSE NEW.updated_at END
  WHERE id = NEW.id;
END;

CREATE TRIGGER normalize_temp_emails_insert_utc_0016
AFTER INSERT ON temp_emails
WHEN ABS((julianday(NEW.created_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE temp_emails SET created_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER normalize_users_insert_utc_0016
AFTER INSERT ON users
WHEN ABS((julianday(NEW.created_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
  OR ABS((julianday(NEW.updated_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE users SET
    created_at = CASE
      WHEN ABS((julianday(NEW.created_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
        THEN CURRENT_TIMESTAMP ELSE NEW.created_at END,
    updated_at = CASE
      WHEN ABS((julianday(NEW.updated_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
        THEN CURRENT_TIMESTAMP ELSE NEW.updated_at END
  WHERE id = NEW.id;
END;

CREATE TRIGGER update_redeem_code_usage_count
AFTER INSERT ON redeem_code_usages
BEGIN
  UPDATE redeem_codes
  SET used_count = used_count + 1
  WHERE id = NEW.redeem_code_id;
END;

-- 标记已包含的历史迁移，后续只应用新增迁移。
INSERT INTO d1_migrations (name) VALUES
  ('0001_initial.sql'),
  ('0002_add_redeem_code_name.sql'),
  ('0003_update_table_defaults.sql'),
  ('0004_add_checkin_and_quota_logs.sql'),
  ('0005_fix_quota_logic.sql'),
  ('0006_redeem_code_multi_use.sql'),
  ('0007_add_announcements.sql'),
  ('0008_quota_expiration_system.sql'),
  ('0009_email_verification_codes.sql'),
  ('0010_add_oauth_support.sql'),
  ('0011_remove_email_verification.sql'),
  ('0012_add_ad_reward_source.sql'),
  ('0013_add_public_inbox.sql'),
  ('0014_security_settings_and_performance.sql'),
  ('0015_inbound_email_idempotency.sql'),
  ('0016_utc_cutover_and_privacy.sql');

DROP TABLE _fresh_install_guard;
