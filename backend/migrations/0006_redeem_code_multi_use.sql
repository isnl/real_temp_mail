-- 兑换码多次使用支持

-- 1. 0002 已添加多次使用字段；这里只迁移并规范现有数据。
-- 将现有的 used 字段转换为 used_count
UPDATE redeem_codes SET 
  max_uses = 1,
  used_count = CASE WHEN used = 1 THEN 1 ELSE 0 END,
  never_expires = 0
WHERE max_uses IS NULL;

-- 2. 创建兑换码使用记录表
CREATE TABLE redeem_code_usages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  redeem_code_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  quota_amount INTEGER NOT NULL,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (redeem_code_id) REFERENCES redeem_codes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(redeem_code_id, user_id) -- 防止同一用户多次使用同一兑换码
);

-- 3. 迁移现有的兑换码使用记录
INSERT INTO redeem_code_usages (redeem_code_id, user_id, quota_amount, used_at)
SELECT 
  rc.id,
  rc.used_by,
  rc.quota,
  rc.used_at
FROM redeem_codes rc
WHERE rc.used = 1 AND rc.used_by IS NOT NULL;

-- 4. 创建索引以提高查询性能
CREATE INDEX idx_redeem_codes_max_uses ON redeem_codes(max_uses);
CREATE INDEX idx_redeem_code_usages_code_id ON redeem_code_usages(redeem_code_id);
CREATE INDEX idx_redeem_code_usages_user_id ON redeem_code_usages(user_id);
CREATE INDEX idx_redeem_code_usages_used_at ON redeem_code_usages(used_at);

-- 5. 创建触发器，自动更新兑换码使用次数
CREATE TRIGGER update_redeem_code_usage_count
AFTER INSERT ON redeem_code_usages
BEGIN
  UPDATE redeem_codes 
  SET used_count = used_count + 1
  WHERE id = NEW.redeem_code_id;
END;

-- 6. 更新配额记录表的关联字段
-- 将 related_id 从兑换码 code 改为兑换码 id
UPDATE quota_logs 
SET related_id = (
  SELECT rc.id 
  FROM redeem_codes rc 
  WHERE rc.code = quota_logs.related_id
)
WHERE source = 'redeem_code' AND related_id IS NOT NULL;
