-- Cut over legacy installations that applied the historical 0003 migration,
-- whose core-table defaults stored China local time without an offset.  A
-- fresh installation applies 0003 in the same migration run, so it must never
-- be shifted. The durable D1 migration timestamp distinguishes an established
-- deployment from a fresh replay; the ten-minute safety window deliberately
-- leaves a just-created database untouched rather than guessing.
CREATE TABLE utc_cutover_state_0016 (
  legacy_plus8 INTEGER NOT NULL,
  core_start TEXT NOT NULL,
  migration_0014 TEXT NOT NULL
);

INSERT INTO utc_cutover_state_0016 (legacy_plus8, core_start, migration_0014)
SELECT
  CASE WHEN EXISTS (
    SELECT 1 FROM d1_migrations
    WHERE name = '0003_update_table_defaults.sql'
      AND datetime(applied_at) <= datetime('now', '-10 minutes')
  ) THEN 1 ELSE 0 END,
  COALESCE((
    SELECT applied_at FROM d1_migrations
    WHERE name = '0003_update_table_defaults.sql'
  ), CURRENT_TIMESTAMP),
  COALESCE((
    SELECT applied_at FROM d1_migrations
    WHERE name = '0014_security_settings_and_performance.sql'
  ), CURRENT_TIMESTAMP);

-- The historical seed shipped a publicly known bcrypt credential. Bcrypt
-- compatibility in the new authenticator must never make that dormant account
-- usable. Match the exact published hash on administrator rows (the email may
-- have been edited), revoke its sessions, and leave an empty password so the
-- setup-token flow can safely take over.
UPDATE refresh_tokens
SET is_revoked = 1
WHERE user_id IN (
  SELECT id FROM users
  WHERE role = 'admin'
    AND password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
);

UPDATE users
SET password_hash = '', is_active = 0, updated_at = CURRENT_TIMESTAMP
WHERE role = 'admin'
  AND password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

-- Rows created before 0003 were already UTC. Legacy +08:00 defaults can only
-- produce values beginning roughly eight hours after the migration boundary.
-- The upper bound avoids touching intentionally future-dated values.
-- Do not rewrite historical users timestamps. The deployed 0010 migration
-- rebuilt users with a UTC default, leaving a genuinely mixed column (older
-- copied +08:00 rows and newer UTC rows) with no per-row discriminator.

UPDATE domains
SET created_at = datetime(created_at, '-8 hours')
WHERE (SELECT legacy_plus8 FROM utc_cutover_state_0016) = 1
  AND datetime(created_at) >= datetime((SELECT core_start FROM utc_cutover_state_0016), '+7 hours')
  AND datetime(created_at) <= datetime('now', '+9 hours');

UPDATE temp_emails
SET created_at = datetime(created_at, '-8 hours')
WHERE (SELECT legacy_plus8 FROM utc_cutover_state_0016) = 1
  AND datetime(created_at) >= datetime((SELECT core_start FROM utc_cutover_state_0016), '+7 hours')
  AND datetime(created_at) <= datetime('now', '+9 hours');

UPDATE emails
SET received_at = datetime(received_at, '-8 hours')
WHERE (SELECT legacy_plus8 FROM utc_cutover_state_0016) = 1
  AND datetime(received_at) >= datetime((SELECT core_start FROM utc_cutover_state_0016), '+7 hours')
  AND datetime(received_at) <= datetime('now', '+9 hours');

UPDATE refresh_tokens
SET created_at = datetime(created_at, '-8 hours')
WHERE (SELECT legacy_plus8 FROM utc_cutover_state_0016) = 1
  AND datetime(created_at) >= datetime((SELECT core_start FROM utc_cutover_state_0016), '+7 hours')
  AND datetime(created_at) <= datetime('now', '+9 hours');

UPDATE logs
SET timestamp = datetime(timestamp, '-8 hours')
WHERE (SELECT legacy_plus8 FROM utc_cutover_state_0016) = 1
  AND datetime(timestamp) >= datetime((SELECT core_start FROM utc_cutover_state_0016), '+7 hours')
  AND datetime(timestamp) <= datetime('now', '+9 hours');

UPDATE redeem_codes
SET
  created_at = CASE
    WHEN datetime(created_at) >= datetime((SELECT core_start FROM utc_cutover_state_0016), '+7 hours')
      AND datetime(created_at) <= datetime('now', '+9 hours')
      THEN datetime(created_at, '-8 hours') ELSE created_at END,
  valid_until = CASE
    WHEN never_expires = 0 AND valid_until IS NOT NULL
      THEN datetime(valid_until, '-8 hours') ELSE valid_until END,
  used_at = CASE
    WHEN used_at IS NOT NULL
      AND datetime(used_at) >= datetime((SELECT core_start FROM utc_cutover_state_0016), '+7 hours')
      AND datetime(used_at) <= datetime('now', '+9 hours')
      THEN datetime(used_at, '-8 hours') ELSE used_at END
WHERE (SELECT legacy_plus8 FROM utc_cutover_state_0016) = 1;

-- These tables were introduced after 0003. Rows written by 0014 itself use
-- UTC already; leave its narrow application window untouched rather than
-- guessing when a value is ambiguous.
UPDATE redeem_code_usages
SET used_at = datetime(used_at, '-8 hours')
WHERE (SELECT legacy_plus8 FROM utc_cutover_state_0016) = 1
  AND datetime(used_at) >= datetime((SELECT core_start FROM utc_cutover_state_0016), '+7 hours')
  AND datetime(used_at) <= datetime('now', '+9 hours')
  AND datetime(used_at) NOT BETWEEN
    datetime((SELECT migration_0014 FROM utc_cutover_state_0016), '-10 minutes')
    AND datetime((SELECT migration_0014 FROM utc_cutover_state_0016), '+10 minutes');

UPDATE announcements
SET
  created_at = CASE
    WHEN datetime(created_at) >= datetime((SELECT core_start FROM utc_cutover_state_0016), '+7 hours')
      AND datetime(created_at) <= datetime('now', '+9 hours')
      THEN datetime(created_at, '-8 hours') ELSE created_at END,
  updated_at = CASE
    WHEN datetime(updated_at) >= datetime((SELECT core_start FROM utc_cutover_state_0016), '+7 hours')
      AND datetime(updated_at) <= datetime('now', '+9 hours')
      THEN datetime(updated_at, '-8 hours') ELSE updated_at END
WHERE (SELECT legacy_plus8 FROM utc_cutover_state_0016) = 1;

UPDATE user_announcement_reads
SET read_at = datetime(read_at, '-8 hours')
WHERE (SELECT legacy_plus8 FROM utc_cutover_state_0016) = 1
  AND datetime(read_at) >= datetime((SELECT core_start FROM utc_cutover_state_0016), '+7 hours')
  AND datetime(read_at) <= datetime('now', '+9 hours');

UPDATE user_checkins
SET created_at = datetime(created_at, '-8 hours')
WHERE (SELECT legacy_plus8 FROM utc_cutover_state_0016) = 1
  AND datetime(created_at) >= datetime((SELECT core_start FROM utc_cutover_state_0016), '+7 hours')
  AND datetime(created_at) <= datetime('now', '+9 hours');

-- oauth_accounts copied the mixed users timestamps in 0014, so they are left
-- untouched for the same reason.

UPDATE quota_logs
SET created_at = datetime(created_at, '-8 hours')
WHERE (SELECT legacy_plus8 FROM utc_cutover_state_0016) = 1
  AND description <> '历史可用配额校准（升级保留）'
  AND datetime(created_at) >= datetime((SELECT core_start FROM utc_cutover_state_0016), '+7 hours')
  AND datetime(created_at) <= datetime('now', '+9 hours')
  AND datetime(created_at) NOT BETWEEN
    datetime((SELECT migration_0014 FROM utc_cutover_state_0016), '-10 minutes')
    AND datetime((SELECT migration_0014 FROM utc_cutover_state_0016), '+10 minutes');

UPDATE quota_logs
SET expires_at = datetime(expires_at, '-8 hours')
WHERE (SELECT legacy_plus8 FROM utc_cutover_state_0016) = 1
  AND source = 'redeem_code'
  AND expires_at IS NOT NULL;

UPDATE user_quota_balances
SET
  created_at = CASE
    WHEN datetime(created_at) NOT BETWEEN
      datetime((SELECT migration_0014 FROM utc_cutover_state_0016), '-10 minutes')
      AND datetime((SELECT migration_0014 FROM utc_cutover_state_0016), '+10 minutes')
      AND datetime(created_at) >= datetime((SELECT core_start FROM utc_cutover_state_0016), '+7 hours')
      AND datetime(created_at) <= datetime('now', '+9 hours')
      THEN datetime(created_at, '-8 hours') ELSE created_at END,
  updated_at = CASE
    WHEN datetime(updated_at) NOT BETWEEN
      datetime((SELECT migration_0014 FROM utc_cutover_state_0016), '-10 minutes')
      AND datetime((SELECT migration_0014 FROM utc_cutover_state_0016), '+10 minutes')
      AND datetime(updated_at) >= datetime((SELECT core_start FROM utc_cutover_state_0016), '+7 hours')
      AND datetime(updated_at) <= datetime('now', '+9 hours')
      THEN datetime(updated_at, '-8 hours') ELSE updated_at END
WHERE (SELECT legacy_plus8 FROM utc_cutover_state_0016) = 1;

UPDATE user_quota_balances
SET expires_at = datetime(expires_at, '-8 hours')
WHERE (SELECT legacy_plus8 FROM utc_cutover_state_0016) = 1
  AND source = 'redeem_code'
  AND expires_at IS NOT NULL;

UPDATE system_settings
SET
  created_at = CASE
    WHEN datetime(created_at) NOT BETWEEN
      datetime((SELECT migration_0014 FROM utc_cutover_state_0016), '-10 minutes')
      AND datetime((SELECT migration_0014 FROM utc_cutover_state_0016), '+10 minutes')
      AND datetime(created_at) >= datetime((SELECT core_start FROM utc_cutover_state_0016), '+7 hours')
      AND datetime(created_at) <= datetime('now', '+9 hours')
      THEN datetime(created_at, '-8 hours') ELSE created_at END,
  updated_at = CASE
    WHEN datetime(updated_at) NOT BETWEEN
      datetime((SELECT migration_0014 FROM utc_cutover_state_0016), '-10 minutes')
      AND datetime((SELECT migration_0014 FROM utc_cutover_state_0016), '+10 minutes')
      AND datetime(updated_at) >= datetime((SELECT core_start FROM utc_cutover_state_0016), '+7 hours')
      AND datetime(updated_at) <= datetime('now', '+9 hours')
      THEN datetime(updated_at, '-8 hours') ELSE updated_at END
WHERE (SELECT legacy_plus8 FROM utc_cutover_state_0016) = 1;

-- Future application writes specify CURRENT_TIMESTAMP explicitly. These
-- guards also make direct SQL inserts safe on upgraded schemas whose physical
-- DEFAULT expression cannot be altered without rebuilding FK parent tables.
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

CREATE TRIGGER normalize_domains_insert_utc_0016
AFTER INSERT ON domains
WHEN ABS((julianday(NEW.created_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE domains SET created_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER normalize_temp_emails_insert_utc_0016
AFTER INSERT ON temp_emails
WHEN ABS((julianday(NEW.created_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE temp_emails SET created_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER normalize_emails_insert_utc_0016
AFTER INSERT ON emails
WHEN ABS((julianday(NEW.received_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE emails SET received_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER normalize_redeem_codes_insert_utc_0016
AFTER INSERT ON redeem_codes
WHEN ABS((julianday(NEW.created_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE redeem_codes SET created_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER normalize_refresh_tokens_insert_utc_0016
AFTER INSERT ON refresh_tokens
WHEN ABS((julianday(NEW.created_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE refresh_tokens SET created_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER normalize_logs_insert_utc_0016
AFTER INSERT ON logs
WHEN ABS((julianday(NEW.timestamp) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE logs SET timestamp = CURRENT_TIMESTAMP WHERE id = NEW.id;
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

CREATE TRIGGER normalize_redeem_usage_insert_utc_0016
AFTER INSERT ON redeem_code_usages
WHEN ABS((julianday(NEW.used_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE redeem_code_usages SET used_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
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

CREATE TRIGGER normalize_announcement_reads_insert_utc_0016
AFTER INSERT ON user_announcement_reads
WHEN ABS((julianday(NEW.read_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE user_announcement_reads SET read_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER normalize_checkins_insert_utc_0016
AFTER INSERT ON user_checkins
WHEN ABS((julianday(NEW.created_at) - julianday(CURRENT_TIMESTAMP)) * 86400 - 28800) <= 120
BEGIN
  UPDATE user_checkins SET created_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Enforce the documented retention/storage boundary immediately on upgrade,
-- including mailboxes that no longer receive new messages. The scheduled
-- Worker repeats the same policy for future rows.
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY temp_email_id ORDER BY id DESC
    ) AS position,
    SUM(
      COALESCE(length(CAST(sender AS BLOB)), 0) +
      COALESCE(length(CAST(subject AS BLOB)), 0) +
      COALESCE(length(CAST(content AS BLOB)), 0) +
      COALESCE(length(CAST(html_content AS BLOB)), 0) +
      COALESCE(length(CAST(verification_code AS BLOB)), 0)
    ) OVER (
      PARTITION BY temp_email_id
      ORDER BY id DESC ROWS UNBOUNDED PRECEDING
    ) AS cumulative_bytes
  FROM emails
)
DELETE FROM emails
WHERE datetime(received_at) <= datetime('now', '-7 days')
  OR id IN (
    SELECT id FROM ranked
    WHERE position > 50 OR cumulative_bytes > 4194304
  );

WITH ranked AS (
  SELECT rowid,
    ROW_NUMBER() OVER (
      PARTITION BY temp_email_id ORDER BY rowid DESC
    ) AS inbox_position,
    ROW_NUMBER() OVER (ORDER BY rowid DESC) AS global_position
  FROM email_delivery_dedup
)
DELETE FROM email_delivery_dedup
WHERE datetime(received_at) < datetime('now', '-24 hours')
  OR rowid IN (
    SELECT rowid FROM ranked
    WHERE inbox_position > 4096 OR global_position > 100000
  );

-- Historical audit rows must not retain a deleted mailbox address indefinitely.
UPDATE quota_logs
SET description = '创建临时邮箱 ID: ' || COALESCE(related_id, 0)
WHERE source = 'create_email'
  AND description LIKE '创建临时邮箱:%';

UPDATE logs
SET details = 'Created temporary email (address redacted)'
WHERE action = 'CREATE_EMAIL'
  AND details LIKE 'Created temp email:%';

UPDATE logs
SET details = CASE
  WHEN details LIKE 'Enabled public inbox for %'
    THEN 'Enabled public inbox (address redacted)'
  ELSE 'Disabled public inbox (address redacted)'
END
WHERE action = 'UPDATE_PUBLIC_INBOX'
  AND (details LIKE 'Enabled public inbox for %'
    OR details LIKE 'Disabled public inbox for %');

UPDATE logs
SET details = 'Inbound email received (addresses redacted)'
WHERE action = 'RECEIVE_EMAIL';

DROP TABLE utc_cutover_state_0016;
