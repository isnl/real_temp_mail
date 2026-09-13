-- Make Email Routing retries idempotent and keep opportunistic rate-limit
-- cleanup indexed. Existing messages have no digest and remain untouched.
ALTER TABLE temp_emails ADD COLUMN creation_key TEXT NULL;

CREATE UNIQUE INDEX idx_temp_emails_creation_key
ON temp_emails(creation_key)
WHERE creation_key IS NOT NULL;

CREATE INDEX idx_temp_emails_email_nocase
ON temp_emails(email COLLATE NOCASE);

ALTER TABLE emails ADD COLUMN dedup_key TEXT NULL;

CREATE UNIQUE INDEX idx_emails_temp_dedup_key
ON emails(temp_email_id, dedup_key)
WHERE dedup_key IS NOT NULL;

CREATE TABLE email_delivery_dedup (
  temp_email_id INTEGER NOT NULL,
  dedup_key TEXT NOT NULL,
  operation_id TEXT NOT NULL UNIQUE,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (temp_email_id, dedup_key),
  FOREIGN KEY (temp_email_id) REFERENCES temp_emails(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_delivery_dedup_received
ON email_delivery_dedup(received_at);

CREATE INDEX idx_rate_limits_window_start
ON rate_limits(window_start);

-- Existing installations keep their configured domains; fresh and upgraded
-- installations both gain the Worker/Email Routing domain when it is absent.
INSERT OR IGNORE INTO domains (domain, status) VALUES ('oooo.icu', 1);
