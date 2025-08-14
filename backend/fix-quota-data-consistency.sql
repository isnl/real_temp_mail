-- 修复配额数据一致性问题
-- 解决 user_quota_balances 表与 quota_logs 表数据不一致的问题

-- 1. 清理现有的 user_quota_balances 数据（重新迁移）
DELETE FROM user_quota_balances;

-- 2. 重新迁移注册配额（永久）
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

-- 3. 重新迁移管理员调整配额（永久）
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

-- 4. 重新迁移兑换码配额（永久）
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

-- 5. 重新迁移签到配额（每日过期）- 逐条迁移而不是聚合
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

-- 6. 验证数据一致性
-- 检查每个用户的配额是否一致
SELECT 
  u.id as user_id,
  u.email,
  -- 从 quota_logs 计算的数据
  COALESCE((SELECT SUM(amount) FROM quota_logs WHERE user_id = u.id AND type = 'earn'), 0) as earned_from_logs,
  COALESCE((SELECT SUM(amount) FROM quota_logs WHERE user_id = u.id AND type = 'consume'), 0) as consumed_from_logs,
  -- 从 user_quota_balances 计算的数据
  COALESCE((SELECT SUM(amount) FROM user_quota_balances WHERE user_id = u.id), 0) as total_from_balances,
  COALESCE((SELECT SUM(amount) FROM user_quota_balances WHERE user_id = u.id AND (expires_at IS NULL OR expires_at > datetime('now', '+8 hours'))), 0) as available_from_balances,
  -- 计算差异
  (COALESCE((SELECT SUM(amount) FROM quota_logs WHERE user_id = u.id AND type = 'earn'), 0) - 
   COALESCE((SELECT SUM(amount) FROM user_quota_balances WHERE user_id = u.id), 0)) as earn_difference
FROM users u
WHERE u.id IN (SELECT DISTINCT user_id FROM quota_logs)
ORDER BY u.id;
