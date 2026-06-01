-- Add a per-temp-email public inbox switch.
-- Disabled by default because incoming mail can contain verification codes.
ALTER TABLE temp_emails
ADD COLUMN public_inbox_enabled BOOLEAN DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_temp_emails_public_inbox
ON temp_emails(email, active, public_inbox_enabled);
