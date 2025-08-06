-- 兑换码多次使用功能迁移
-- 添加最大使用次数字段，创建使用记录表

-- 1. 为兑换码表添加最大使用次数字段
ALTER TABLE redeem_codes ADD COLUMN max_uses INTEGER DEFAULT 1;

-- 2. 创建兑换码使用记录表
CREATE TABLE redeem_code_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  used_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  FOREIGN KEY (code) REFERENCES redeem_codes(code) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(code, user_id) -- 确保同一用户不能多次使用同一兑换码
);

-- 3. 为现有兑换码设置默认最大使用次数为1
UPDATE redeem_codes SET max_uses = 1 WHERE max_uses IS NULL;

-- 4. 将现有的使用记录迁移到新表
INSERT INTO redeem_code_usage (code, user_id, used_at)
SELECT code, used_by, used_at
FROM redeem_codes
WHERE used = 1 AND used_by IS NOT NULL;

-- 5. 创建索引以提高查询性能
CREATE INDEX idx_redeem_code_usage_code ON redeem_code_usage(code);
CREATE INDEX idx_redeem_code_usage_user_id ON redeem_code_usage(user_id);
CREATE INDEX idx_redeem_code_usage_used_at ON redeem_code_usage(used_at);
