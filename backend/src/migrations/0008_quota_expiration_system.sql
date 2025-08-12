-- 配额过期系统迁移
-- 添加配额过期时间和类型字段，支持不同类型配额的过期策略

-- 1. 为 quota_logs 表添加过期时间和配额类型字段
ALTER TABLE quota_logs ADD COLUMN expires_at TIMESTAMP NULL;
ALTER TABLE quota_logs ADD COLUMN quota_type TEXT DEFAULT 'permanent' CHECK (quota_type IN ('permanent', 'daily', 'custom'));

-- 2. 为 redeem_codes 表添加永不过期支持
ALTER TABLE redeem_codes ADD COLUMN never_expires BOOLEAN DEFAULT 0;

-- 3. 创建用户配额余额表（用于跟踪不同类型配额的余额和过期时间）
CREATE TABLE user_quota_balances (
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

-- 4. 创建索引以提高查询性能
CREATE INDEX idx_user_quota_balances_user_id ON user_quota_balances(user_id);
CREATE INDEX idx_user_quota_balances_expires_at ON user_quota_balances(expires_at);
CREATE INDEX idx_user_quota_balances_quota_type ON user_quota_balances(quota_type);
CREATE INDEX idx_user_quota_balances_user_expires ON user_quota_balances(user_id, expires_at);

-- 5. 更新现有的 quota_logs 记录，设置配额类型
-- 注册配额设为永久
UPDATE quota_logs 
SET quota_type = 'permanent', expires_at = NULL 
WHERE source = 'register';

-- 管理员调整配额设为永久
UPDATE quota_logs 
SET quota_type = 'permanent', expires_at = NULL 
WHERE source = 'admin_adjust';

-- 兑换码配额暂时设为永久（后续会根据兑换码设置调整）
UPDATE quota_logs 
SET quota_type = 'permanent', expires_at = NULL 
WHERE source = 'redeem_code';

-- 签到配额设为每日过期（设置为当天24点过期）
UPDATE quota_logs 
SET quota_type = 'daily',
    expires_at = datetime(date(created_at, '+8 hours'), '+1 day', '-8 hours')
WHERE source = 'checkin';

-- 6. 迁移现有配额数据到 user_quota_balances 表
-- 首先处理注册配额（永久）
INSERT INTO user_quota_balances (user_id, quota_type, amount, expires_at, source, source_id, created_at, updated_at)
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

-- 处理管理员调整配额（永久）
INSERT INTO user_quota_balances (user_id, quota_type, amount, expires_at, source, source_id, created_at, updated_at)
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

-- 处理兑换码配额（暂时设为永久，后续会调整）
INSERT INTO user_quota_balances (user_id, quota_type, amount, expires_at, source, source_id, created_at, updated_at)
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

-- 处理签到配额（每日过期）
INSERT INTO user_quota_balances (user_id, quota_type, amount, expires_at, source, source_id, created_at, updated_at)
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

-- 7. 减去已消费的配额
-- 计算每个用户已消费的配额总量
CREATE TEMPORARY TABLE user_consumed_quota AS
SELECT 
  user_id,
  SUM(amount) as total_consumed
FROM quota_logs 
WHERE type = 'consume'
GROUP BY user_id;

-- 按过期时间顺序减去已消费的配额（优先从即将过期的配额中扣除）
-- 这里需要用程序逻辑来处理，SQL 难以实现复杂的优先级扣除逻辑
-- 暂时保持现有的 users.quota 字段作为剩余配额的总和

-- 8. 添加触发器，自动清理过期配额
-- 注意：SQLite 不支持事件调度器，需要在应用层定期清理过期配额
