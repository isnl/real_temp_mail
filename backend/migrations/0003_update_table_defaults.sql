-- 更新表的默认时间值为中国时间
-- 由于SQLite不支持直接修改列的默认值，我们需要重建表

-- 1. 备份现有数据并重建 users 表
CREATE TABLE users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  quota INTEGER DEFAULT 5,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  updated_at TIMESTAMP DEFAULT (datetime('now', '+8 hours'))
);

INSERT INTO users_new SELECT * FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- 2. 重建 domains 表
CREATE TABLE domains_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT UNIQUE NOT NULL,
  status INTEGER DEFAULT 1 CHECK (status IN (0, 1)),
  created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours'))
);

INSERT INTO domains_new SELECT * FROM domains;
DROP TABLE domains;
ALTER TABLE domains_new RENAME TO domains;

-- 3. 重建 temp_emails 表
CREATE TABLE temp_emails_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  email TEXT UNIQUE NOT NULL,
  domain_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  active BOOLEAN DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (domain_id) REFERENCES domains(id)
);

INSERT INTO temp_emails_new SELECT * FROM temp_emails;
DROP TABLE temp_emails;
ALTER TABLE temp_emails_new RENAME TO temp_emails;

-- 4. 重建 emails 表
CREATE TABLE emails_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  temp_email_id INTEGER NOT NULL,
  sender TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  received_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  is_read BOOLEAN DEFAULT 0,
  FOREIGN KEY (temp_email_id) REFERENCES temp_emails(id) ON DELETE CASCADE
);

INSERT INTO emails_new SELECT * FROM emails;
DROP TABLE emails;
ALTER TABLE emails_new RENAME TO emails;

-- 5. 重建 refresh_tokens 表
CREATE TABLE refresh_tokens_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO refresh_tokens_new SELECT * FROM refresh_tokens;
DROP TABLE refresh_tokens;
ALTER TABLE refresh_tokens_new RENAME TO refresh_tokens;

-- 6. 重建 logs 表
CREATE TABLE logs_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT,
  timestamp TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO logs_new SELECT * FROM logs;
DROP TABLE logs;
ALTER TABLE logs_new RENAME TO logs;

-- 7. 重建 rate_limits 表
CREATE TABLE rate_limits_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  UNIQUE(identifier, endpoint)
);

INSERT INTO rate_limits_new SELECT * FROM rate_limits;
DROP TABLE rate_limits;
ALTER TABLE rate_limits_new RENAME TO rate_limits;

-- 8. 重建 redeem_codes 表
CREATE TABLE redeem_codes_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  quota INTEGER NOT NULL,
  used BOOLEAN DEFAULT 0,
  used_by INTEGER,
  created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  used_at TIMESTAMP,
  valid_until TIMESTAMP,
  FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO redeem_codes_new SELECT * FROM redeem_codes;
DROP TABLE redeem_codes;
ALTER TABLE redeem_codes_new RENAME TO redeem_codes;

-- 重新创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_temp_emails_user_id ON temp_emails(user_id);
CREATE INDEX idx_temp_emails_email ON temp_emails(email);
CREATE INDEX idx_emails_temp_email_id ON emails(temp_email_id);
CREATE INDEX idx_emails_received_at ON emails(received_at);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_timestamp ON logs(timestamp);
CREATE INDEX idx_rate_limits_identifier_endpoint ON rate_limits(identifier, endpoint);
