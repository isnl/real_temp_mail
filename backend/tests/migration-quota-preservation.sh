#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
database_file="$(mktemp /tmp/real-temp-mail-quota.XXXXXX)"
trap 'rm -f -- "$database_file"' EXIT

sqlite3 -bail "$database_file" <<'SQL'
CREATE TABLE d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
SQL

for migration in "$repo_root"/backend/migrations/*.sql; do
  if [[ "$(basename "$migration")" == "0014_security_settings_and_performance.sql" ]]; then
    break
  fi
  sqlite3 -bail "$database_file" "PRAGMA foreign_keys=ON;" ".read $migration"
  sqlite3 -bail "$database_file" \
    "INSERT INTO d1_migrations (name) VALUES ('$(basename "$migration")');"
done

sqlite3 -bail "$database_file" <<'SQL'
PRAGMA foreign_keys=ON;
INSERT INTO users
  (email, password_hash, quota, role, is_active, provider, created_at, updated_at)
VALUES
  ('deduct@example.test', 'x', 3, 'user', 1, 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('topup@example.test', 'x', 5, 'user', 1, 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('expiry@example.test', 'x', 4, 'user', 1, 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('expired-in-ledger@example.test', 'x', 13, 'user', 1, 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('partial-expired-ledger@example.test', 'x', 9, 'user', 1, 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('untracked-with-expiry@example.test', 'x', 16, 'user', 1, 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('zero@example.test', 'x', 0, 'user', 1, 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

DELETE FROM user_quota_balances;
DELETE FROM quota_logs;

-- An earn-only balance of five must retain the already-consumed legacy value
-- of three, removing the soonest-expiring two first.
INSERT INTO user_quota_balances
  (user_id, quota_type, amount, expires_at, source, created_at, updated_at)
SELECT id, 'custom', 2, datetime('now', '+1 day'), 'register', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users WHERE email = 'deduct@example.test';
INSERT INTO user_quota_balances
  (user_id, quota_type, amount, expires_at, source, created_at, updated_at)
SELECT id, 'permanent', 3, NULL, 'register', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users WHERE email = 'deduct@example.test';

-- Missing historical balances must be restored and audited.
INSERT INTO user_quota_balances
  (user_id, quota_type, amount, expires_at, source, created_at, updated_at)
SELECT id, 'permanent', 2, NULL, 'register', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users WHERE email = 'topup@example.test';

-- Expired quota must remain expired and must not be revived by reconciliation.
INSERT INTO user_quota_balances
  (user_id, quota_type, amount, expires_at, source, created_at, updated_at)
SELECT id, 'daily', 7, datetime('now', '-1 day'), 'checkin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users WHERE email = 'expiry@example.test';
INSERT INTO user_quota_balances
  (user_id, quota_type, amount, expires_at, source, created_at, updated_at)
SELECT id, 'permanent', 6, NULL, 'register', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users WHERE email = 'expiry@example.test';

-- Expired grants may still be present in users.quota because the legacy
-- application cleaned them only when a quota endpoint happened to run.
-- They must not be converted into permanent quota during migration.
INSERT INTO user_quota_balances
  (user_id, quota_type, amount, expires_at, source, created_at, updated_at)
SELECT id, 'permanent', 6, NULL, 'register', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users WHERE email IN (
  'expired-in-ledger@example.test',
  'partial-expired-ledger@example.test',
  'untracked-with-expiry@example.test'
);
INSERT INTO user_quota_balances
  (user_id, quota_type, amount, expires_at, source, created_at, updated_at)
SELECT id, 'daily', 7, datetime('now', '-1 day'), 'checkin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users WHERE email IN (
  'expired-in-ledger@example.test',
  'partial-expired-ledger@example.test',
  'untracked-with-expiry@example.test'
);
SQL

sqlite3 -bail "$database_file" \
  "PRAGMA foreign_keys=ON;" \
  ".read $repo_root/backend/migrations/0014_security_settings_and_performance.sql"

mismatch_count="$(sqlite3 "$database_file" <<'SQL'
WITH expected(email, quota) AS (
  VALUES
    ('deduct@example.test', 3),
    ('topup@example.test', 5),
    ('expiry@example.test', 4),
    ('expired-in-ledger@example.test', 6),
    ('partial-expired-ledger@example.test', 6),
    ('untracked-with-expiry@example.test', 9),
    ('zero@example.test', 0)
), actual AS (
  SELECT
    users.email,
    users.quota,
    COALESCE(SUM(CASE
      WHEN balances.amount > 0 AND (
        balances.expires_at IS NULL OR datetime(balances.expires_at) > CURRENT_TIMESTAMP
      ) THEN balances.amount ELSE 0 END), 0) AS active_quota
  FROM users
  LEFT JOIN user_quota_balances balances ON balances.user_id = users.id
  WHERE users.email LIKE '%@example.test'
  GROUP BY users.id
)
SELECT COUNT(*)
FROM expected
LEFT JOIN actual USING (email)
WHERE actual.quota IS NULL
  OR actual.quota <> expected.quota
  OR actual.active_quota <> expected.quota;
SQL
)"
[[ "$mismatch_count" == "0" ]] || {
  echo "quota migration changed available quota for $mismatch_count fixture(s)" >&2
  exit 1
}

expiry_first_amount="$(sqlite3 "$database_file" <<'SQL'
SELECT balances.amount
FROM user_quota_balances balances
JOIN users ON users.id = balances.user_id
WHERE users.email = 'deduct@example.test' AND balances.expires_at IS NOT NULL
LIMIT 1;
SQL
)"
[[ "$expiry_first_amount" == "0" ]] || {
  echo "quota migration did not deduct the earliest-expiring balance first" >&2
  exit 1
}

topup_audit_count="$(sqlite3 "$database_file" <<'SQL'
SELECT COUNT(*)
FROM quota_logs logs
JOIN users ON users.id = logs.user_id
WHERE users.email = 'topup@example.test'
  AND logs.type = 'earn'
  AND logs.amount = 3
  AND logs.source = 'admin_adjust'
  AND logs.description = '历史可用配额校准（升级保留）';
SQL
)"
[[ "$topup_audit_count" == "1" ]] || {
  echo "quota migration did not create the expected historical top-up audit" >&2
  exit 1
}

foreign_key_errors="$(sqlite3 "$database_file" "PRAGMA foreign_key_check;")"
[[ -z "$foreign_key_errors" ]] || {
  echo "$foreign_key_errors" >&2
  exit 1
}

echo "quota migration preservation fixtures passed"
