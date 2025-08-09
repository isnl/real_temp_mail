-- 添加公告系统表

-- 公告表
CREATE TABLE announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
  updated_at TIMESTAMP DEFAULT (datetime('now', '+8 hours'))
);

-- 创建索引以提高查询性能
CREATE INDEX idx_announcements_is_active ON announcements(is_active);
CREATE INDEX idx_announcements_created_at ON announcements(created_at);

-- 插入示例公告（Markdown格式）
INSERT INTO announcements (title, content, is_active) VALUES
('欢迎使用临时邮箱系统', '# 欢迎使用我们的临时邮箱系统！

本系统提供**安全、便捷**的临时邮箱服务，保护您的隐私。

## 主要功能

* 支持多个域名
* 实时接收邮件
* 自动清理过期邮件
* 简洁易用的界面

> 开始使用临时邮箱，保护您的真实邮箱地址！', 1),
('系统维护通知', '## 系统维护通知

为了提供更好的服务，我们将在每周日凌晨 **2:00-4:00** 进行系统维护。

### 维护内容
1. 数据库优化
2. 系统安全更新
3. 性能提升

维护期间可能会出现短暂的服务中断，请您谅解。

---

如有紧急问题，请联系客服。', 1);
