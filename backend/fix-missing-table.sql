-- 修复缺失的 user_quota_balances 表
-- 这个脚本专门用于修复生产环境中缺失的表

-- 1. 创建用户配额余额表（如果不存在）
CREATE TABLE IF NOT EXISTS user_quota_balances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  quota_type TEXT NOT NULL CHECK (quota_type IN ('permanent', 'daily', 'custom')),
  amount INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP NULL, -- NULL 表示永不过期
  source TEXT NOT NULL CHECK (source IN ('register', 'checkin', 'redeem_code', 'admin_adjust')),
  source_id INTEGER NULL, -- 来源记录ID（如兑换码、签到记录等）
  created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  updated_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_user_quota_balances_user_id ON user_quota_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quota_balances_expires_at ON user_quota_balances(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_quota_balances_quota_type ON user_quota_balances(quota_type);
CREATE INDEX IF NOT EXISTS idx_user_quota_balances_user_expires ON user_quota_balances(user_id, expires_at);

-- 3. 为 quota_logs 表添加缺失的字段（如果不存在）
-- 检查字段是否存在，如果不存在则添加
-- 注意：SQLite 的 ALTER TABLE ADD COLUMN 如果字段已存在会报错，所以我们需要小心处理

-- 添加过期时间字段
-- ALTER TABLE quota_logs ADD COLUMN expires_at TIMESTAMP NULL;

-- 添加配额类型字段  
-- ALTER TABLE quota_logs ADD COLUMN quota_type TEXT DEFAULT 'permanent' CHECK (quota_type IN ('permanent', 'daily', 'custom'));

-- 4. 为 redeem_codes 表添加缺失的字段（如果不存在）
-- ALTER TABLE redeem_codes ADD COLUMN never_expires BOOLEAN DEFAULT 0;

-- 5. 如果 user_quota_balances 表是空的，则迁移现有数据
-- 首先检查表是否为空
-- 如果为空，则从 quota_logs 迁移数据

-- 迁移注册配额（永久）
INSERT OR IGNORE INTO user_quota_balances (user_id, quota_type, amount, expires_at, source, source_id, created_at, updated_at)
SELECT 
  user_id,
  'permanent',
  SUM(amount),
  NULL,
  'register',
  NULL,
  MIN(created_at),
  MAX(created_at)
FROM quota_logs 
WHERE type = 'earn' AND source = 'register'
GROUP BY user_id;

-- 迁移管理员调整配额（永久）
INSERT OR IGNORE INTO user_quota_balances (user_id, quota_type, amount, expires_at, source, source_id, created_at, updated_at)
SELECT 
  user_id,
  'permanent',
  SUM(amount),
  NULL,
  'admin_adjust',
  related_id,
  MIN(created_at),
  MAX(created_at)
FROM quota_logs 
WHERE type = 'earn' AND source = 'admin_adjust'
GROUP BY user_id, related_id;

-- 迁移兑换码配额（永久）
INSERT OR IGNORE INTO user_quota_balances (user_id, quota_type, amount, expires_at, source, source_id, created_at, updated_at)
SELECT 
  user_id,
  'permanent',
  SUM(amount),
  NULL,
  'redeem_code',
  related_id,
  MIN(created_at),
  MAX(created_at)
FROM quota_logs 
WHERE type = 'earn' AND source = 'redeem_code'
GROUP BY user_id, related_id;

-- 迁移签到配额（每日过期）
INSERT OR IGNORE INTO user_quota_balances (user_id, quota_type, amount, expires_at, source, source_id, created_at, updated_at)
SELECT 
  user_id,
  'daily',
  amount,
  datetime(date(created_at, '+8 hours'), '+1 day', '-8 hours'),
  'checkin',
  related_id,
  created_at,
  created_at
FROM quota_logs 
WHERE type = 'earn' AND source = 'checkin';

-- 6. 验证数据完整性
-- 检查是否有用户的配额余额与 users 表中的配额不匹配
-- 这里只是查询，不做修改，让管理员手动检查

SELECT 
  u.id,
  u.email,
  u.quota as user_table_quota,
  COALESCE(SUM(uqb.amount), 0) as balance_table_quota,
  (u.quota - COALESCE(SUM(uqb.amount), 0)) as difference
FROM users u
LEFT JOIN user_quota_balances uqb ON u.id = uqb.user_id 
  AND (uqb.expires_at IS NULL OR uqb.expires_at > datetime('now', '+8 hours'))
GROUP BY u.id, u.email, u.quota
HAVING difference != 0
LIMIT 10;
