-- 修复配额逻辑：将 users.quota 从总配额改为剩余配额
-- 这个迁移脚本需要根据 quota_logs 重新计算每个用户的剩余配额

-- 1. 为每个用户重新计算剩余配额
-- 剩余配额 = 总获得配额 - 总消费配额

UPDATE users 
SET quota = (
  -- 计算用户的剩余配额
  COALESCE(
    (SELECT SUM(CASE WHEN type = 'earn' THEN amount ELSE 0 END) - 
            SUM(CASE WHEN type = 'consume' THEN amount ELSE 0 END)
     FROM quota_logs 
     WHERE user_id = users.id), 
    users.quota  -- 如果没有配额记录，保持原值
  )
)
WHERE is_active = 1;

-- 2. 确保没有用户的剩余配额为负数（防止数据异常）
UPDATE users 
SET quota = 0 
WHERE quota < 0 AND is_active = 1;

-- 3. 添加注释说明字段含义的变化
-- 注意：从此版本开始，users.quota 字段表示剩余配额，而不是总配额
-- 总配额需要通过 quota_logs 表计算得出
