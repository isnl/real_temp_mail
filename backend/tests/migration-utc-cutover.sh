#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
database_file="$(mktemp /tmp/real-temp-mail-utc.XXXXXX)"
trap 'rm -f -- "$database_file"' EXIT

sqlite3 -bail "$database_file" <<'SQL'
PRAGMA foreign_keys=ON;
CREATE TABLE d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
SQL

# Recreate the deployed 0003 lineage: its core-table defaults were UTC+8 with
# no offset. The current 0001 is transformed only inside this disposable test.
sed "s/DEFAULT CURRENT_TIMESTAMP/DEFAULT (datetime('now', '+8 hours'))/g" \
  "$repo_root/backend/migrations/0001_initial.sql" | sqlite3 -bail "$database_file"
sqlite3 "$database_file" \
  "INSERT INTO d1_migrations(name, applied_at) VALUES('0001_initial.sql', CURRENT_TIMESTAMP);"

# This row predates the bad default migration and is already UTC. It must stay
# byte-for-byte unchanged.
sqlite3 -bail "$database_file" <<'SQL'
PRAGMA foreign_keys=ON;
INSERT INTO users
  (email, password_hash, quota, role, created_at, updated_at)
VALUES
  ('pre-cutover@example.test', 'hash', 5, 'user',
   datetime('now', '-60 days'), datetime('now', '-60 days'));
SQL

for migration in "$repo_root"/backend/migrations/*.sql; do
  migration_name="$(basename "$migration")"
  case "$migration_name" in
    0001_initial.sql|0016_utc_cutover_and_privacy.sql) continue ;;
  esac
  sqlite3 -bail "$database_file" "PRAGMA foreign_keys=ON;" ".read $migration"
  sqlite3 "$database_file" \
    "INSERT INTO d1_migrations(name, applied_at) VALUES('$migration_name', CURRENT_TIMESTAMP);"
done

# Mark 0003 as an established deployment rather than a fresh replay. Rows that
# predate it above are older still; post-0003 fixtures below use the old +8
# write contract.
sqlite3 "$database_file" \
  "UPDATE d1_migrations SET applied_at=datetime('now','-30 days') WHERE name='0003_update_table_defaults.sql';"

pre_cutover_timestamp="$(sqlite3 "$database_file" \
  "SELECT created_at FROM users WHERE email='pre-cutover@example.test';")"

# Model rows written by the old application after 0003. It relied on +08:00
# defaults for these fields and also copied full mailbox addresses into logs.
sqlite3 -bail "$database_file" <<'SQL'
PRAGMA foreign_keys=ON;
INSERT INTO users
  (email, password_hash, quota, role, is_active, provider, created_at, updated_at)
VALUES
  ('legacy-local@example.test', 'hash', 1, 'user', 1, 'email',
   datetime('now', '+8 hours'), datetime('now', '+8 hours'));
INSERT INTO temp_emails
  (user_id, email, domain_id, created_at, active, public_inbox_enabled)
SELECT users.id, 'legacy-box@oooo.icu', domains.id,
  datetime('now', '+8 hours'), 1, 1
FROM users, domains
WHERE users.email='legacy-local@example.test' AND domains.domain='oooo.icu';
INSERT INTO emails
  (temp_email_id, sender, subject, content, received_at)
SELECT id, 'sender@example.test', 'legacy local', 'body', datetime('now', '+8 hours')
FROM temp_emails WHERE email='legacy-box@oooo.icu';
INSERT INTO logs (user_id, action, details, timestamp)
SELECT id, 'CREATE_EMAIL', 'Created temp email: legacy-box@oooo.icu',
  datetime('now', '+8 hours')
FROM users WHERE email='legacy-local@example.test';
INSERT INTO logs (user_id, action, details, timestamp)
SELECT id, 'RECEIVE_EMAIL',
  'Received sender@example.test for legacy-box@oooo.icu', datetime('now', '+8 hours')
FROM users WHERE email='legacy-local@example.test';
INSERT INTO quota_logs
  (user_id, type, amount, source, description, related_id, quota_type, created_at)
SELECT users.id, 'consume', 1, 'create_email',
  '创建临时邮箱: legacy-box@oooo.icu', temp_emails.id, 'permanent',
  datetime('now', '+8 hours')
FROM users JOIN temp_emails ON temp_emails.user_id=users.id
WHERE users.email='legacy-local@example.test';
INSERT INTO announcements
  (title, content, type, is_active, priority, created_by, created_at, updated_at)
SELECT 'legacy time', 'body', 'info', 1, 0, id,
  datetime('now', '+8 hours'), datetime('now', '+8 hours')
FROM users WHERE email='legacy-local@example.test';
INSERT INTO redeem_codes
  (code, name, quota, valid_until, max_uses, never_expires, created_at)
VALUES
  ('UTC-CUTOVER', 'UTC cutover', 2, datetime('now', '+9 hours'), 1, 0,
   datetime('now', '+8 hours'));
INSERT INTO user_quota_balances
  (user_id, quota_type, amount, expires_at, source, source_id, created_at, updated_at)
SELECT users.id, 'custom', 2, datetime('now', '+9 hours'), 'redeem_code',
  redeem_codes.id, datetime('now', '+8 hours'), datetime('now', '+8 hours')
FROM users, redeem_codes
WHERE users.email='legacy-local@example.test' AND redeem_codes.code='UTC-CUTOVER';
INSERT INTO users
  (email, username, password_hash, quota, role, is_active, provider, created_at, updated_at)
VALUES
  ('renamed-public-admin@example.test', 'renamed-admin',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   999999, 'admin', 1, 'email', datetime('now', '+8 hours'), datetime('now', '+8 hours'));
INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at, is_revoked)
SELECT id, 'legacy-public-admin-token', datetime('now', '+1 day'),
  datetime('now', '+8 hours'), 0
FROM users WHERE email='renamed-public-admin@example.test';
SQL

sqlite3 -bail "$database_file" \
  "PRAGMA foreign_keys=ON;" \
  ".read $repo_root/backend/migrations/0016_utc_cutover_and_privacy.sql"

legacy_time_errors="$(sqlite3 "$database_file" <<'SQL'
SELECT
  (SELECT COUNT(*) FROM temp_emails
    WHERE email='legacy-box@oooo.icu'
      AND ABS(strftime('%s', created_at) - strftime('%s', 'now')) > 180) +
  (SELECT COUNT(*) FROM emails
    WHERE subject='legacy local'
      AND ABS(strftime('%s', received_at) - strftime('%s', 'now')) > 180) +
  (SELECT COUNT(*) FROM announcements
    WHERE title='legacy time'
      AND ABS(strftime('%s', created_at) - strftime('%s', 'now')) > 180);
SQL
)"
[[ "$legacy_time_errors" == "0" ]] || {
  echo "UTC cutover failed to normalize $legacy_time_errors legacy timestamp fixture(s)" >&2
  exit 1
}

expiry_delta="$(sqlite3 "$database_file" \
  "SELECT strftime('%s', valid_until)-strftime('%s','now') FROM redeem_codes WHERE code='UTC-CUTOVER';")"
[[ "$expiry_delta" -ge 3300 && "$expiry_delta" -le 3900 ]] || {
  echo "UTC cutover did not convert a legacy local redeem-code deadline" >&2
  exit 1
}

balance_expiry_delta="$(sqlite3 "$database_file" <<'SQL'
SELECT strftime('%s', balances.expires_at)-strftime('%s','now')
FROM user_quota_balances balances
JOIN redeem_codes ON redeem_codes.id=balances.source_id
WHERE balances.source='redeem_code' AND redeem_codes.code='UTC-CUTOVER';
SQL
)"
[[ "$balance_expiry_delta" -ge 3300 && "$balance_expiry_delta" -le 3900 ]] || {
  echo "UTC cutover did not convert the matching redeem quota expiry" >&2
  exit 1
}

legacy_admin_errors="$(sqlite3 "$database_file" <<'SQL'
SELECT
  (SELECT COUNT(*) FROM users
    WHERE email='renamed-public-admin@example.test'
      AND (password_hash <> '' OR is_active <> 0)) +
  (SELECT COUNT(*) FROM refresh_tokens
    WHERE token_hash='legacy-public-admin-token' AND is_revoked <> 1);
SQL
)"
[[ "$legacy_admin_errors" == "0" ]] || {
  echo "legacy public administrator credential was not neutralized" >&2
  exit 1
}

# Mirror the existing-admin branch of bootstrapPrimaryAdmin. Clearing the
# published hash must leave exactly the takeover state expected by the
# setup-token flow, while the old refresh token remains revoked.
sqlite3 -bail "$database_file" <<'SQL'
UPDATE users
SET username='replacement-admin',
  email='replacement-admin@example.test',
  password_hash='replacement-private-hash',
  is_active=1,
  updated_at=CURRENT_TIMESTAMP
WHERE id=(SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1)
  AND (password_hash IS NULL OR password_hash='');
SQL

bootstrap_errors="$(sqlite3 "$database_file" <<'SQL'
SELECT
  (SELECT CASE WHEN COUNT(*)=1 THEN 0 ELSE 1 END FROM users
    WHERE role='admin'
      AND username='replacement-admin'
      AND email='replacement-admin@example.test'
      AND password_hash='replacement-private-hash'
      AND is_active=1) +
  (SELECT COUNT(*) FROM refresh_tokens
    WHERE token_hash='legacy-public-admin-token' AND is_revoked<>1);
SQL
)"
[[ "$bootstrap_errors" == "0" ]] || {
  echo "neutralized administrator could not be safely bootstrapped" >&2
  exit 1
}

post_pre_cutover_timestamp="$(sqlite3 "$database_file" \
  "SELECT created_at FROM users WHERE email='pre-cutover@example.test';")"
[[ "$post_pre_cutover_timestamp" == "$pre_cutover_timestamp" ]] || {
  echo "UTC cutover shifted an already-UTC pre-0003 row" >&2
  exit 1
}

privacy_errors="$(sqlite3 "$database_file" <<'SQL'
SELECT
  (SELECT COUNT(*) FROM logs
    WHERE action='CREATE_EMAIL' AND details LIKE '%legacy-box@oooo.icu%') +
  (SELECT COUNT(*) FROM quota_logs
    WHERE source='create_email' AND description LIKE '%legacy-box@oooo.icu%') +
  (SELECT COUNT(*) FROM logs
    WHERE action='RECEIVE_EMAIL' AND details LIKE '%legacy-box@oooo.icu%');
SQL
)"
[[ "$privacy_errors" == "0" ]] || {
  echo "UTC/privacy migration retained $privacy_errors mailbox address fixture(s)" >&2
  exit 1
}

# The upgraded table still physically has its historical +8 DEFAULT. The
# guard trigger must make an omitted timestamp effective UTC without rebuilding
# this FK parent table.
sqlite3 "$database_file" \
  "INSERT INTO users(email,password_hash,quota,role) VALUES('trigger@example.test','hash',0,'user');"
trigger_delta="$(sqlite3 "$database_file" \
  "SELECT ABS(strftime('%s', created_at)-strftime('%s','now')) FROM users WHERE email='trigger@example.test';")"
[[ "$trigger_delta" -le 180 ]] || {
  echo "legacy default guard did not normalize a new direct insert" >&2
  exit 1
}

foreign_key_errors="$(sqlite3 "$database_file" "PRAGMA foreign_key_check;")"
[[ -z "$foreign_key_errors" ]] || {
  echo "$foreign_key_errors" >&2
  exit 1
}

echo "UTC cutover and privacy fixtures passed"
