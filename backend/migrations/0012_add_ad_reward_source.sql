-- 添加广告奖励源类型支持
-- 为配额系统添加 'ad_reward' 源类型

-- 由于 SQLite 不支持直接修改 CHECK 约束，我们需要重建表
-- 但是为了避免约束冲突，我们分步骤进行

-- 1. 首先处理 user_quota_balances 表
-- 创建新表，包含新的 source 约束
CREATE TABLE user_quota_balances_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  quota_type TEXT NOT NULL CHECK (quota_type IN ('permanent', 'daily', 'custom')),
  amount INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP NULL,
  source TEXT NOT NULL CHECK (source IN ('register', 'checkin', 'redeem_code', 'admin_adjust', 'ad_reward')),
  source_id INTEGER NULL,
  created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  updated_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 复制数据到新表
INSERT INTO user_quota_balances_new
SELECT id, user_id, quota_type, amount, expires_at, source, source_id, created_at, updated_at
FROM user_quota_balances;

-- 删除旧表
DROP TABLE user_quota_balances;

-- 重命名新表
ALTER TABLE user_quota_balances_new RENAME TO user_quota_balances;

-- 重新创建索引
CREATE INDEX idx_user_quota_balances_user_id ON user_quota_balances(user_id);
CREATE INDEX idx_user_quota_balances_expires_at ON user_quota_balances(expires_at);
CREATE INDEX idx_user_quota_balances_quota_type ON user_quota_balances(quota_type);
CREATE INDEX idx_user_quota_balances_user_expires ON user_quota_balances(user_id, expires_at);

-- 2. 处理 quota_logs 表
-- 创建新表，包含新的 source 约束
CREATE TABLE quota_logs_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'consume')),
  amount INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('register', 'checkin', 'redeem_code', 'admin_adjust', 'create_email', 'ad_reward')),
  description TEXT,
  related_id INTEGER NULL,
  expires_at TIMESTAMP NULL,
  quota_type TEXT DEFAULT 'permanent' CHECK (quota_type IN ('permanent', 'daily', 'custom')),
  created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 复制数据到新表
INSERT INTO quota_logs_new
SELECT id, user_id, type, amount, source, description, related_id, expires_at, quota_type, created_at
FROM quota_logs;

-- 删除旧表
DROP TABLE quota_logs;

-- 重命名新表
ALTER TABLE quota_logs_new RENAME TO quota_logs;

-- 重新创建索引
CREATE INDEX idx_quota_logs_user_id ON quota_logs(user_id);
CREATE INDEX idx_quota_logs_created_at ON quota_logs(created_at);
CREATE INDEX idx_quota_logs_type ON quota_logs(type);
CREATE INDEX idx_quota_logs_source ON quota_logs(source);
CREATE INDEX idx_quota_logs_expires_at ON quota_logs(expires_at);
CREATE INDEX idx_quota_logs_user_type ON quota_logs(user_id, type);
CREATE INDEX idx_quota_logs_user_source ON quota_logs(user_id, source);
