-- Historical versions rebuilt every core table merely to change timestamp
-- defaults. With foreign_keys enabled, dropping users/domains/temp_emails
-- cascaded into child rows and destroyed real data. The original 0001 schema
-- already stores UTC, so keep all parent tables in place.
--
-- Later migrations do require a numeric redeem_codes.id. At this point no
-- table references redeem_codes yet (redeem_code_usages is introduced in
-- 0006), so this one child table can be rebuilt without cascading data loss.

CREATE TABLE redeem_codes_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  quota INTEGER NOT NULL,
  name TEXT,
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  never_expires BOOLEAN DEFAULT 0,
  used BOOLEAN DEFAULT 0,
  used_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP,
  valid_until TIMESTAMP,
  FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO redeem_codes_new
  (code, quota, name, max_uses, used_count, never_expires, used, used_by,
   created_at, used_at, valid_until)
SELECT code, quota, name, max_uses, used_count, never_expires, used, used_by,
  created_at, used_at, valid_until
FROM redeem_codes;

DROP TABLE redeem_codes;
ALTER TABLE redeem_codes_new RENAME TO redeem_codes;

-- Parent-table indexes from 0001 remain intact because those tables were not
-- rebuilt. Recreate only the indexes that belonged to redeem_codes.
CREATE INDEX IF NOT EXISTS idx_redeem_codes_name ON redeem_codes(name);
CREATE INDEX IF NOT EXISTS idx_redeem_codes_valid_until ON redeem_codes(valid_until);
CREATE INDEX IF NOT EXISTS idx_redeem_codes_never_expires ON redeem_codes(never_expires);
CREATE INDEX IF NOT EXISTS idx_redeem_codes_used_count ON redeem_codes(used_count);
