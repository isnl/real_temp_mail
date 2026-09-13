-- One-time compatibility baseline for installations whose schema was created
-- by the historical setup scripts but whose d1_migrations table is empty.
-- The guard deliberately fails on an empty, partially upgraded, or already
-- tracked database. Back up the remote D1 database before running this file.

CREATE TEMP TABLE legacy_baseline_guard (
  valid INTEGER NOT NULL CHECK (valid = 1)
);

INSERT INTO legacy_baseline_guard (valid)
SELECT CASE WHEN
  (SELECT COUNT(*) FROM d1_migrations) = 0
  AND EXISTS (
    SELECT 1 FROM sqlite_master
    WHERE type = 'table' AND name = 'redeem_code_usage'
  )
  AND NOT EXISTS (
    SELECT 1 FROM sqlite_master
    WHERE type = 'table' AND name = 'redeem_code_usages'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pragma_table_info('redeem_codes') WHERE name = 'id'
  )
  AND EXISTS (
    SELECT 1 FROM pragma_table_info('users') WHERE name = 'provider'
  )
  AND EXISTS (
    SELECT 1 FROM pragma_table_info('temp_emails')
    WHERE name = 'public_inbox_enabled'
  )
  AND EXISTS (
    SELECT 1 FROM sqlite_master
    WHERE type = 'table' AND name = 'user_quota_balances'
  )
  THEN 1 ELSE 0 END;

INSERT INTO d1_migrations (name, applied_at)
VALUES
  ('0001_initial.sql', datetime('now', '-1 day')),
  ('0002_add_redeem_code_name.sql', datetime('now', '-1 day')),
  ('0003_update_table_defaults.sql', datetime('now', '-1 day')),
  ('0004_add_checkin_and_quota_logs.sql', datetime('now', '-1 day')),
  ('0005_fix_quota_logic.sql', datetime('now', '-1 day')),
  ('0006_redeem_code_multi_use.sql', datetime('now', '-1 day')),
  ('0007_add_announcements.sql', datetime('now', '-1 day')),
  ('0008_quota_expiration_system.sql', datetime('now', '-1 day')),
  ('0009_email_verification_codes.sql', datetime('now', '-1 day')),
  ('0010_add_oauth_support.sql', datetime('now', '-1 day')),
  ('0011_remove_email_verification.sql', datetime('now', '-1 day')),
  ('0012_add_ad_reward_source.sql', datetime('now', '-1 day')),
  ('0013_add_public_inbox.sql', datetime('now', '-1 day'));

DROP TABLE legacy_baseline_guard;
