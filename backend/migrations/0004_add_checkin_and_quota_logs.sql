-- 添加签到系统和配额记录表

-- 1. 系统配置表
CREATE TABLE system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  updated_at TIMESTAMP DEFAULT (datetime('now', '+8 hours'))
);

-- 插入默认签到配额设置
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('daily_checkin_quota', '2', '每日签到奖励配额数量');

-- 2. 用户签到记录表
CREATE TABLE user_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  checkin_date DATE NOT NULL,
  quota_reward INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, checkin_date)
);

-- 3. 配额记录表（记录所有配额变动）
CREATE TABLE quota_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'consume')),
  amount INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('register', 'checkin', 'redeem_code', 'admin_adjust', 'create_email')),
  description TEXT,
  related_id INTEGER, -- 关联记录ID（如签到记录ID、兑换码ID等）
  created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引以提高查询性能
CREATE INDEX idx_user_checkins_user_id ON user_checkins(user_id);
CREATE INDEX idx_user_checkins_date ON user_checkins(checkin_date);
CREATE INDEX idx_quota_logs_user_id ON quota_logs(user_id);
CREATE INDEX idx_quota_logs_type ON quota_logs(type);
CREATE INDEX idx_quota_logs_source ON quota_logs(source);
CREATE INDEX idx_quota_logs_created_at ON quota_logs(created_at);
CREATE INDEX idx_system_settings_key ON system_settings(setting_key);

-- 为现有用户创建注册配额记录
INSERT INTO quota_logs (user_id, type, amount, source, description, created_at)
SELECT 
  id,
  'earn',
  quota,
  'register',
  '注册奖励配额',
  created_at
FROM users 
WHERE quota > 0;
