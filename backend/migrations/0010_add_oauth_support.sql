-- 添加第三方登录支持的迁移
-- 注意：这个迁移文件是为了处理现有数据库的升级

-- 1. 添加新的列到用户表
ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'email' CHECK (provider IN ('email', 'github'));
ALTER TABLE users ADD COLUMN provider_id TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN display_name TEXT;

-- 2. 修改password_hash列为可选（SQLite不支持直接修改列约束，需要重建表）
-- 创建新的用户表结构
CREATE TABLE users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  quota INTEGER DEFAULT 5,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN DEFAULT 1,
  provider TEXT DEFAULT 'email' CHECK (provider IN ('email', 'github')),
  provider_id TEXT,
  avatar_url TEXT,
  display_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_id)
);

-- 3. 复制现有数据到新表
INSERT INTO users_new (id, email, password_hash, quota, role, is_active, provider, created_at, updated_at)
SELECT id, email, password_hash, quota, role, is_active, 'email', created_at, updated_at
FROM users;

-- 4. 删除旧表并重命名新表
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- 5. 重新创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider_id ON users(provider, provider_id);

-- 6. 重新创建外键约束（通过重建相关表）
-- 注意：在实际生产环境中，这需要更仔细的处理
-- 这里假设我们在开发环境中，可以接受数据重建
