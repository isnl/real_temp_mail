-- 修复配额逻辑问题

-- 1. 清理重复的注册配额记录
DELETE FROM quota_logs 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM quota_logs 
  WHERE source = 'register' 
  GROUP BY user_id
);

-- 2. 确保每个用户只有一条注册配额记录
-- 如果用户没有注册配额记录，则创建一条
INSERT INTO quota_logs (user_id, type, amount, source, description, created_at)
SELECT 
  u.id,
  'earn',
  5, -- 默认注册配额
  'register',
  '注册奖励配额',
  u.created_at
FROM users u
LEFT JOIN quota_logs ql ON u.id = ql.user_id AND ql.source = 'register'
WHERE ql.id IS NULL;

-- 3. 更新用户表的配额字段，确保与配额记录一致
UPDATE users SET quota = (
  SELECT COALESCE(
    (SELECT SUM(amount) FROM quota_logs WHERE user_id = users.id AND type = 'earn') -
    (SELECT COALESCE(SUM(amount), 0) FROM quota_logs WHERE user_id = users.id AND type = 'consume'),
    0
  )
);

-- 4. 添加配额变动触发器（可选，用于自动更新用户配额）
-- 注意：SQLite 触发器语法
CREATE TRIGGER update_user_quota_after_log_insert
AFTER INSERT ON quota_logs
BEGIN
  UPDATE users 
  SET quota = (
    SELECT COALESCE(
      (SELECT SUM(amount) FROM quota_logs WHERE user_id = NEW.user_id AND type = 'earn') -
      (SELECT COALESCE(SUM(amount), 0) FROM quota_logs WHERE user_id = NEW.user_id AND type = 'consume'),
      0
    )
  )
  WHERE id = NEW.user_id;
END;

CREATE TRIGGER update_user_quota_after_log_update
AFTER UPDATE ON quota_logs
BEGIN
  UPDATE users 
  SET quota = (
    SELECT COALESCE(
      (SELECT SUM(amount) FROM quota_logs WHERE user_id = NEW.user_id AND type = 'earn') -
      (SELECT COALESCE(SUM(amount), 0) FROM quota_logs WHERE user_id = NEW.user_id AND type = 'consume'),
      0
    )
  )
  WHERE id = NEW.user_id;
END;

CREATE TRIGGER update_user_quota_after_log_delete
AFTER DELETE ON quota_logs
BEGIN
  UPDATE users 
  SET quota = (
    SELECT COALESCE(
      (SELECT SUM(amount) FROM quota_logs WHERE user_id = OLD.user_id AND type = 'earn') -
      (SELECT COALESCE(SUM(amount), 0) FROM quota_logs WHERE user_id = OLD.user_id AND type = 'consume'),
      0
    )
  )
  WHERE id = OLD.user_id;
END;
