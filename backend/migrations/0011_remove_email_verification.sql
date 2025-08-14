-- 移除邮箱验证码表（不再需要）
-- 注意：这个迁移会删除邮箱验证码相关的数据

-- 删除邮箱验证码表
DROP TABLE IF EXISTS email_verification_codes;

-- 删除相关索引（如果存在）
DROP INDEX IF EXISTS idx_email_verification_codes_email;
DROP INDEX IF EXISTS idx_email_verification_codes_expires_at;
