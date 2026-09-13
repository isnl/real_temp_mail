#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
database_file="$(mktemp /tmp/real-temp-mail-core.XXXXXX)"
trap 'rm -f -- "$database_file"' EXIT

sqlite3 -bail "$database_file" <<'SQL'
CREATE TABLE d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
SQL

for migration in "$repo_root"/backend/migrations/0001_initial.sql \
  "$repo_root"/backend/migrations/0002_add_redeem_code_name.sql; do
  sqlite3 -bail "$database_file" "PRAGMA foreign_keys=ON;" ".read $migration"
  sqlite3 -bail "$database_file" \
    "INSERT INTO d1_migrations (name) VALUES ('$(basename "$migration")');"
done

sqlite3 -bail "$database_file" <<'SQL'
PRAGMA foreign_keys=ON;
INSERT INTO users (email, password_hash, quota, role)
VALUES ('preserve@example.test', 'hash', 5, 'user');
INSERT INTO temp_emails (user_id, email, domain_id)
SELECT users.id, 'box@oooo.icu', domains.id
FROM users, domains
WHERE users.email = 'preserve@example.test' AND domains.domain = 'oooo.icu';
INSERT INTO emails (temp_email_id, sender, subject, content)
SELECT id, 'sender@example.test', 'preserve-subject', 'preserve-body'
FROM temp_emails WHERE email = 'box@oooo.icu';
INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
SELECT id, 'preserve-token', datetime('now', '+30 days')
FROM users WHERE email = 'preserve@example.test';
INSERT INTO logs (user_id, action, details)
SELECT id, 'PRESERVE', 'preserve-log'
FROM users WHERE email = 'preserve@example.test';
INSERT INTO redeem_codes
  (code, quota, valid_until, used, used_by, name, max_uses, used_count, never_expires)
SELECT 'PRESERVE-CODE', 3, datetime('now', '+30 days'), 1, id,
  'preserve-code', 1, 1, 0
FROM users WHERE email = 'preserve@example.test';
SQL

for migration in "$repo_root"/backend/migrations/*.sql; do
  case "$(basename "$migration")" in
    0001_initial.sql|0002_add_redeem_code_name.sql) continue ;;
  esac
  sqlite3 -bail "$database_file" "PRAGMA foreign_keys=ON;" ".read $migration"
  sqlite3 -bail "$database_file" \
    "INSERT INTO d1_migrations (name) VALUES ('$(basename "$migration")');"
done

mismatch_count="$(sqlite3 "$database_file" <<'SQL'
SELECT
  (SELECT COUNT(*) <> 1 FROM users WHERE email = 'preserve@example.test') +
  (SELECT COUNT(*) <> 1 FROM temp_emails WHERE email = 'box@oooo.icu') +
  (SELECT COUNT(*) <> 1 FROM emails WHERE subject = 'preserve-subject' AND content = 'preserve-body') +
  (SELECT COUNT(*) <> 1 FROM refresh_tokens WHERE token_hash = 'preserve-token') +
  (SELECT COUNT(*) <> 1 FROM logs WHERE action = 'PRESERVE' AND user_id IS NOT NULL) +
  (SELECT COUNT(*) <> 1 FROM redeem_codes WHERE code = 'PRESERVE-CODE');
SQL
)"

[[ "$mismatch_count" == "0" ]] || {
  echo "core migration lost or detached $mismatch_count fixture(s)" >&2
  sqlite3 -header -column "$database_file" <<'SQL' >&2
SELECT 'users' AS fixture, COUNT(*) AS rows FROM users WHERE email = 'preserve@example.test'
UNION ALL SELECT 'temp_emails', COUNT(*) FROM temp_emails WHERE email = 'box@oooo.icu'
UNION ALL SELECT 'emails', COUNT(*) FROM emails WHERE subject = 'preserve-subject' AND content = 'preserve-body'
UNION ALL SELECT 'refresh_tokens', COUNT(*) FROM refresh_tokens WHERE token_hash = 'preserve-token'
UNION ALL SELECT 'attached_logs', COUNT(*) FROM logs WHERE action = 'PRESERVE' AND user_id IS NOT NULL
UNION ALL SELECT 'redeem_codes', COUNT(*) FROM redeem_codes WHERE code = 'PRESERVE-CODE';
SQL
  exit 1
}

foreign_key_errors="$(sqlite3 "$database_file" "PRAGMA foreign_key_check;")"
[[ -z "$foreign_key_errors" ]] || {
  echo "$foreign_key_errors" >&2
  exit 1
}

echo "core migration preservation fixtures passed"
