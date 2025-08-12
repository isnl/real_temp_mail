-- 为兑换码表添加名称字段和其他扩展字段
ALTER TABLE redeem_codes ADD COLUMN name TEXT;                    -- 兑换码名称（非必填）
ALTER TABLE redeem_codes ADD COLUMN max_uses INTEGER DEFAULT 1;   -- 最大使用次数
ALTER TABLE redeem_codes ADD COLUMN used_count INTEGER DEFAULT 0; -- 已使用次数
ALTER TABLE redeem_codes ADD COLUMN never_expires BOOLEAN DEFAULT 0; -- 是否永不过期

-- 更新现有数据
UPDATE redeem_codes SET 
  max_uses = 1,
  used_count = CASE WHEN used = 1 THEN 1 ELSE 0 END,
  never_expires = 0
WHERE max_uses IS NULL;

-- 创建索引以提高查询性能
CREATE INDEX idx_redeem_codes_name ON redeem_codes(name);
CREATE INDEX idx_redeem_codes_valid_until ON redeem_codes(valid_until);
CREATE INDEX idx_redeem_codes_never_expires ON redeem_codes(never_expires);
CREATE INDEX idx_redeem_codes_used_count ON redeem_codes(used_count);
