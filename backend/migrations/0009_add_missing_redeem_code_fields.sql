-- 添加兑换码表缺失的字段
-- 这个迁移用于修复生产环境数据库表结构

-- 只添加 never_expires 字段（其他字段可能已存在）
ALTER TABLE redeem_codes ADD COLUMN never_expires BOOLEAN DEFAULT 0;

-- 更新现有数据
UPDATE redeem_codes SET
  never_expires = 0
WHERE never_expires IS NULL;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_redeem_codes_never_expires ON redeem_codes(never_expires);

-- 创建兑换码使用记录表（如果不存在）
CREATE TABLE IF NOT EXISTS redeem_code_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  used_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  FOREIGN KEY (code) REFERENCES redeem_codes(code) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(code, user_id) -- 确保同一用户不能多次使用同一兑换码
);
