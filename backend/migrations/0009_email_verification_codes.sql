-- 添加邮箱验证码系统

-- 1. 创建邮箱验证码表
CREATE TABLE email_verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('register', 'reset_password', 'change_email')),
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT 0,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  ip_address TEXT,
  user_agent TEXT
);

-- 2. 创建索引以提高查询性能
CREATE INDEX idx_email_verification_codes_email ON email_verification_codes(email);
CREATE INDEX idx_email_verification_codes_code ON email_verification_codes(code);
CREATE INDEX idx_email_verification_codes_type ON email_verification_codes(type);
CREATE INDEX idx_email_verification_codes_expires_at ON email_verification_codes(expires_at);
CREATE INDEX idx_email_verification_codes_used ON email_verification_codes(used);
CREATE INDEX idx_email_verification_codes_created_at ON email_verification_codes(created_at);

-- 3. 为用户表添加邮箱验证状态字段
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP NULL;

-- 4. 将现有用户标记为已验证（向后兼容）
UPDATE users SET 
  email_verified = 1,
  email_verified_at = created_at
WHERE email_verified IS NULL OR email_verified = 0;

-- 5. 过期验证码清理
-- 注意：由于 Cloudflare D1 对触发器支持有限，过期验证码的清理在应用层面处理
