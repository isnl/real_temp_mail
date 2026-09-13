-- 兑换码多次使用支持

-- 1. 0002 已添加多次使用字段；这里只迁移并规范现有数据。
-- 将现有的 used 字段转换为 used_count
UPDATE redeem_codes SET 
  max_uses = 1,
  used_count = CASE WHEN used = 1 THEN 1 ELSE 0 END,
  never_expires = 0
WHERE max_uses IS NULL;

-- 2. 保持旧部署所使用的 code 外键结构。0014 会在同一事务中把兑换码
-- 和使用记录一起转换为数值 ID，避免先重建父表导致使用记录被级联删除。
CREATE TABLE redeem_code_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (code) REFERENCES redeem_codes(code) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(code, user_id)
);

-- 3. 迁移现有的兑换码使用记录
INSERT INTO redeem_code_usage (code, user_id, used_at)
SELECT 
  rc.code,
  rc.used_by,
  COALESCE(rc.used_at, CURRENT_TIMESTAMP)
FROM redeem_codes rc
WHERE rc.used = 1 AND rc.used_by IS NOT NULL;

-- 4. 创建索引以提高查询性能
CREATE INDEX idx_redeem_codes_max_uses ON redeem_codes(max_uses);
CREATE INDEX idx_redeem_code_usage_code ON redeem_code_usage(code);
CREATE INDEX idx_redeem_code_usage_user_id ON redeem_code_usage(user_id);
CREATE INDEX idx_redeem_code_usage_used_at ON redeem_code_usage(used_at);

-- 5. 创建触发器，自动更新兑换码使用次数
CREATE TRIGGER update_redeem_code_usage_count
AFTER INSERT ON redeem_code_usage
BEGIN
  UPDATE redeem_codes 
  SET used_count = used_count + 1
  WHERE code = NEW.code;
END;
