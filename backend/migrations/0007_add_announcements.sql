-- 添加公告系统

-- 1. 创建公告表
CREATE TABLE announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  is_active BOOLEAN DEFAULT 1,
  priority INTEGER DEFAULT 0, -- 优先级，数字越大优先级越高
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  updated_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. 创建用户公告阅读记录表
CREATE TABLE user_announcement_reads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  announcement_id INTEGER NOT NULL,
  read_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  UNIQUE(user_id, announcement_id)
);

-- 3. 创建索引以提高查询性能
CREATE INDEX idx_announcements_is_active ON announcements(is_active);
CREATE INDEX idx_announcements_priority ON announcements(priority);
CREATE INDEX idx_announcements_created_at ON announcements(created_at);
CREATE INDEX idx_announcements_type ON announcements(type);
CREATE INDEX idx_user_announcement_reads_user_id ON user_announcement_reads(user_id);
CREATE INDEX idx_user_announcement_reads_announcement_id ON user_announcement_reads(announcement_id);
CREATE INDEX idx_user_announcement_reads_read_at ON user_announcement_reads(read_at);

-- 4. 插入默认公告
INSERT INTO announcements (title, content, type, is_active, priority, created_by)
VALUES 
  ('欢迎使用临时邮箱系统', '感谢您使用我们的临时邮箱服务！请注意保护您的隐私安全。', 'info', 1, 1, 1),
  ('系统维护通知', '系统将在每周日凌晨2-4点进行例行维护，期间可能影响服务使用。', 'warning', 1, 2, 1);
