#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
database_file="$(mktemp /tmp/real-temp-mail-legacy-redeem.XXXXXX)"
trap 'rm -f -- "$database_file"' EXIT

sqlite3 -bail "$database_file" <<'SQL'
CREATE TABLE d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
SQL

for migration in "$repo_root"/backend/migrations/000*.sql \
  "$repo_root"/backend/migrations/001[0-3]*.sql; do
  sqlite3 -bail "$database_file" "PRAGMA foreign_keys=ON;" ".read $migration"
  sqlite3 -bail "$database_file" \
    "INSERT INTO d1_migrations (name, applied_at) VALUES ('$(basename "$migration")', '2025-08-01 00:00:00');"
done

sqlite3 -bail "$database_file" <<'SQL'
PRAGMA foreign_keys=ON;
INSERT INTO users
  (email, password_hash, quota, role, is_active, provider, created_at, updated_at)
VALUES
  ('legacy-redeem@example.test', 'hash', 5, 'user', 1, 'email',
   datetime('now', '+8 hours'), datetime('now', '+8 hours'));

INSERT INTO user_quota_balances
  (user_id, quota_type, amount, source, created_at, updated_at)
SELECT id, 'permanent', 5, 'register',
  datetime('now', '+8 hours'), datetime('now', '+8 hours')
FROM users WHERE email = 'legacy-redeem@example.test';

INSERT INTO redeem_codes
  (code, quota, name, max_uses, used_count, never_expires, used, used_by,
   created_at, used_at, valid_until)
SELECT 'LEGACY-CODE', 3, 'legacy fixture', 2, 0, 0, 1, id,
  datetime('now', '+8 hours'), datetime('now', '+8 hours'),
  datetime('now', '+30 days', '+8 hours')
FROM users WHERE email = 'legacy-redeem@example.test';

INSERT INTO redeem_code_usage (code, user_id, used_at)
SELECT 'LEGACY-CODE', id, datetime('now', '+8 hours')
FROM users WHERE email = 'legacy-redeem@example.test';

INSERT INTO quota_logs
  (user_id, type, amount, source, description, related_id, expires_at,
   quota_type, created_at)
SELECT id, 'earn', 3, 'redeem_code', 'legacy redemption', 'LEGACY-CODE',
  datetime('now', '+30 days', '+8 hours'), 'custom', datetime('now', '+8 hours')
FROM users WHERE email = 'legacy-redeem@example.test';
SQL

for migration in "$repo_root"/backend/migrations/0014_security_settings_and_performance.sql \
  "$repo_root"/backend/migrations/0015_inbound_email_idempotency.sql \
  "$repo_root"/backend/migrations/0016_utc_cutover_and_privacy.sql; do
  sqlite3 -bail "$database_file" "PRAGMA foreign_keys=ON;" ".read $migration"
  sqlite3 -bail "$database_file" \
    "INSERT INTO d1_migrations (name) VALUES ('$(basename "$migration")');"
done

invariant_errors="$(sqlite3 "$database_file" <<'SQL'
SELECT
  (SELECT COUNT(*) <> 1
   FROM redeem_codes
   WHERE code = 'LEGACY-CODE' AND quota = 3 AND max_uses = 2
     AND used_count = 1 AND used = 1) +
  (SELECT COUNT(*) <> 1
   FROM redeem_code_usages usage
   JOIN redeem_codes code ON code.id = usage.redeem_code_id
   JOIN users ON users.id = usage.user_id
   WHERE code.code = 'LEGACY-CODE'
     AND users.email = 'legacy-redeem@example.test'
     AND usage.quota_amount = 3
     AND usage.operation_id IS NULL) +
  (SELECT COUNT(*) <> 1
   FROM quota_logs log
   JOIN redeem_codes code ON code.id = log.related_id
   WHERE log.description = 'legacy redemption'
     AND code.code = 'LEGACY-CODE') +
  (SELECT COUNT(*) FROM sqlite_master
   WHERE type = 'table' AND name = 'redeem_code_usage') +
  (SELECT COUNT(*) <> 1 FROM pragma_table_info('redeem_codes')
   WHERE name = 'id' AND pk = 1) +
  (SELECT COUNT(*) <> 16 FROM d1_migrations);
SQL
)"

[[ "$invariant_errors" == "0" ]] || {
  echo "legacy redeem migration invariant failures: $invariant_errors" >&2
  exit 1
}

foreign_key_errors="$(sqlite3 "$database_file" "PRAGMA foreign_key_check;")"
[[ -z "$foreign_key_errors" ]] || {
  echo "$foreign_key_errors" >&2
  exit 1
}

echo "legacy production redeem migration fixtures passed"
