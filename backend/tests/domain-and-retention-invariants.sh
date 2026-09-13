#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
database_file="$(mktemp /tmp/real-temp-mail-invariants.XXXXXX)"
trap 'rm -f -- "$database_file"' EXIT

sqlite3 -bail "$database_file" <<'SQL'
CREATE TABLE d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
SQL

for migration in "$repo_root"/backend/migrations/*.sql; do
  sqlite3 -bail "$database_file" "PRAGMA foreign_keys=ON;" ".read $migration"
  sqlite3 -bail "$database_file" \
    "INSERT INTO d1_migrations (name) VALUES ('$(basename "$migration")');"
done

sqlite3 -bail "$database_file" <<'SQL'
PRAGMA foreign_keys=ON;
INSERT INTO users
  (email, password_hash, quota, role, is_active, provider, created_at, updated_at)
VALUES
  ('invariants@example.test', 'hash', 0, 'user', 1, 'email',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO domains (domain, status, created_at, deleted_at)
VALUES ('fixture.example', 1, CURRENT_TIMESTAMP, NULL);
INSERT INTO temp_emails
  (user_id, email, domain_id, created_at, active, public_inbox_enabled)
SELECT users.id, 'restore@fixture.example', domains.id,
  CURRENT_TIMESTAMP, 1, 1
FROM users, domains
WHERE users.email='invariants@example.test' AND domains.domain='fixture.example';

-- Mirrors AdminService.deleteDomain's atomic batch.
BEGIN IMMEDIATE;
UPDATE temp_emails
SET active=0, public_inbox_enabled=0
WHERE domain_id=(SELECT id FROM domains WHERE domain='fixture.example')
  AND EXISTS (
    SELECT 1 FROM domains
    WHERE domain='fixture.example' AND deleted_at IS NULL
  );
UPDATE domains
SET status=0, deleted_at=CURRENT_TIMESTAMP
WHERE domain='fixture.example' AND deleted_at IS NULL;
COMMIT;

-- Mirrors createDomain's restore UPSERT. Restoring a domain must not revive
-- mailboxes that were invalidated when it was removed.
INSERT INTO domains (domain, status, created_at, deleted_at)
VALUES ('fixture.example', 1, CURRENT_TIMESTAMP, NULL)
ON CONFLICT(domain) DO UPDATE SET
  status=excluded.status,
  deleted_at=NULL
WHERE domains.deleted_at IS NOT NULL;

INSERT INTO temp_emails
  (user_id, email, domain_id, created_at, active, public_inbox_enabled)
SELECT users.id, 'count@fixture.example', domains.id,
  CURRENT_TIMESTAMP, 1, 0
FROM users, domains
WHERE users.email='invariants@example.test' AND domains.domain='fixture.example';
WITH RECURSIVE sequence(value) AS (
  VALUES(1) UNION ALL SELECT value + 1 FROM sequence WHERE value < 55
)
INSERT INTO emails (temp_email_id, sender, subject, content, received_at)
SELECT temp_emails.id, 'sender@example.test', 'count-' || sequence.value,
  'body', CURRENT_TIMESTAMP
FROM temp_emails, sequence
WHERE temp_emails.email='count@fixture.example';

INSERT INTO temp_emails
  (user_id, email, domain_id, created_at, active, public_inbox_enabled)
SELECT users.id, 'bytes@fixture.example', domains.id,
  CURRENT_TIMESTAMP, 1, 0
FROM users, domains
WHERE users.email='invariants@example.test' AND domains.domain='fixture.example';
INSERT INTO emails (temp_email_id, sender, subject, content, received_at)
SELECT id, 'sender@example.test', 'large-old', zeroblob(3145728), CURRENT_TIMESTAMP
FROM temp_emails WHERE email='bytes@fixture.example';
INSERT INTO emails (temp_email_id, sender, subject, content, received_at)
SELECT id, 'sender@example.test', 'large-new', zeroblob(3145728), CURRENT_TIMESTAMP
FROM temp_emails WHERE email='bytes@fixture.example';

INSERT INTO emails (temp_email_id, sender, subject, content, received_at)
SELECT id, 'sender@example.test', 'expired-message', 'body', datetime('now', '-7 days')
FROM temp_emails WHERE email='restore@fixture.example';

WITH RECURSIVE sequence(value) AS (
  VALUES(1) UNION ALL SELECT value + 1 FROM sequence WHERE value < 4100
)
INSERT INTO email_delivery_dedup
  (temp_email_id, dedup_key, operation_id, received_at)
SELECT temp_emails.id, 'key-' || sequence.value, 'operation-' || sequence.value,
  CURRENT_TIMESTAMP
FROM temp_emails, sequence
WHERE temp_emails.email='count@fixture.example';
INSERT INTO email_delivery_dedup
  (temp_email_id, dedup_key, operation_id, received_at)
SELECT id, 'expired-key', 'expired-operation', datetime('now', '-24 hours')
FROM temp_emails WHERE email='restore@fixture.example';

-- Mirrors DatabaseService.cleanupRetainedData.
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
WHERE datetime(received_at) <= datetime('now', '-24 hours')
  OR rowid IN (
    SELECT rowid FROM ranked
    WHERE inbox_position > 4096 OR global_position > 100000
  );
SQL

invariant_errors="$(sqlite3 "$database_file" <<'SQL'
SELECT
  (SELECT COUNT(*) FROM domains
    WHERE domain='fixture.example' AND (status<>1 OR deleted_at IS NOT NULL)) +
  (SELECT COUNT(*) FROM temp_emails
    WHERE email='restore@fixture.example'
      AND (active<>0 OR public_inbox_enabled<>0)) +
  (SELECT ABS(COUNT(*) - 50)
    FROM emails JOIN temp_emails ON temp_emails.id=emails.temp_email_id
    WHERE temp_emails.email='count@fixture.example') +
  (SELECT CASE WHEN COUNT(*)=1 AND COALESCE(SUM(
      COALESCE(length(CAST(emails.sender AS BLOB)), 0) +
      COALESCE(length(CAST(emails.subject AS BLOB)), 0) +
      COALESCE(length(CAST(emails.content AS BLOB)), 0) +
      COALESCE(length(CAST(emails.html_content AS BLOB)), 0) +
      COALESCE(length(CAST(emails.verification_code AS BLOB)), 0)
    ), 0) <= 4194304 THEN 0 ELSE 1 END
    FROM emails JOIN temp_emails ON temp_emails.id=emails.temp_email_id
    WHERE temp_emails.email='bytes@fixture.example') +
  (SELECT COUNT(*) FROM emails WHERE subject='expired-message') +
  (SELECT CASE WHEN COUNT(*) <= 4096 THEN 0 ELSE 1 END
    FROM email_delivery_dedup delivery
    JOIN temp_emails ON temp_emails.id=delivery.temp_email_id
    WHERE temp_emails.email='count@fixture.example') +
  (SELECT COUNT(*) FROM email_delivery_dedup
    WHERE operation_id='expired-operation');
SQL
)"

[[ "$invariant_errors" == "0" ]] || {
  echo "domain/retention invariant failures: $invariant_errors" >&2
  exit 1
}

foreign_key_errors="$(sqlite3 "$database_file" "PRAGMA foreign_key_check;")"
[[ -z "$foreign_key_errors" ]] || {
  echo "$foreign_key_errors" >&2
  exit 1
}

echo "domain deletion and retention invariants passed"
