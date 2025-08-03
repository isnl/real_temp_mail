-- 修正时区问题：将所有现有的时间字段加上8小时
-- 这个迁移脚本用于修正已存在的数据

-- 修正用户表的时间字段
UPDATE users 
SET 
  created_at = datetime(created_at, '+8 hours'),
  updated_at = datetime(updated_at, '+8 hours')
WHERE created_at IS NOT NULL;

-- 修正域名表的时间字段
UPDATE domains 
SET created_at = datetime(created_at, '+8 hours')
WHERE created_at IS NOT NULL;

-- 修正临时邮箱表的时间字段
UPDATE temp_emails 
SET created_at = datetime(created_at, '+8 hours')
WHERE created_at IS NOT NULL;

-- 修正邮件表的时间字段
UPDATE emails 
SET received_at = datetime(received_at, '+8 hours')
WHERE received_at IS NOT NULL;

-- 修正兑换码表的时间字段
UPDATE redeem_codes 
SET 
  created_at = datetime(created_at, '+8 hours'),
  used_at = datetime(used_at, '+8 hours'),
  valid_until = datetime(valid_until, '+8 hours')
WHERE created_at IS NOT NULL;

-- 修正刷新令牌表的时间字段
UPDATE refresh_tokens 
SET 
  created_at = datetime(created_at, '+8 hours'),
  expires_at = datetime(expires_at, '+8 hours')
WHERE created_at IS NOT NULL;

-- 修正操作日志表的时间字段
UPDATE logs 
SET timestamp = datetime(timestamp, '+8 hours')
WHERE timestamp IS NOT NULL;

-- 修正限流表的时间字段
UPDATE rate_limits 
SET window_start = datetime(window_start, '+8 hours')
WHERE window_start IS NOT NULL;
