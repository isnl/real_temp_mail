# GitHub OAuth 登录设置指南

## 概述

本项目已移除邮箱注册功能，现在只支持GitHub OAuth第三方登录。

## GitHub OAuth 应用设置

### 1. 创建GitHub OAuth应用

1. 登录GitHub，进入 Settings > Developer settings > OAuth Apps
2. 点击 "New OAuth App"
3. 填写应用信息：
   - **Application name**: 临时邮箱服务
   - **Homepage URL**: `https://oooo.icu` (生产环境) 或 `http://localhost:5173` (开发环境)
   - **Authorization callback URL**: `https://api.oooo.icu/api/auth/github/callback` (生产环境) 或 `http://localhost:8787/api/auth/github/callback` (开发环境)

### 2. 获取客户端凭据

创建应用后，你将获得：
- **Client ID**: `Ov23liMbRVOzZ5igeF1M`
- **Client Secret**: `2fffc1c362e84ad5e5b8f7ad6801d9b7b8b52268`

### 3. 配置环境变量

GitHub OAuth环境变量已经配置在 `backend/wrangler.toml` 文件中：

```toml
# 域名配置
BASE_DOMAIN = "api.oooo.icu"      # API域名
FRONTEND_DOMAIN = "oooo.icu"      # 前端域名

# GitHub OAuth 配置
GITHUB_CLIENT_ID = "Ov23liMbRVOzZ5igeF1M"
GITHUB_CLIENT_SECRET = "2fffc1c362e84ad5e5b8f7ad6801d9b7b8b52268"
```

这些变量已经添加到了生产环境、开发环境和默认环境配置中。

## 登录流程

### 用户登录流程

1. 用户访问登录页面 `/login`
2. 点击 "使用 GitHub 登录" 按钮
3. 重定向到 `/api/auth/github`
4. 系统重定向到GitHub授权页面
5. 用户在GitHub上授权应用
6. GitHub重定向到 `/api/auth/github/callback`
7. 系统处理授权码，获取用户信息
8. 如果是新用户，自动创建账户并分配默认配额
9. 生成JWT token并重定向到前端
10. 前端接收token并跳转到仪表板

### 技术实现

- **授权URL生成**: `/api/auth/github`
- **回调处理**: `/api/auth/github/callback`
- **用户信息获取**: GitHub API v3
- **账户关联**: 支持将现有邮箱账户关联到GitHub

## 数据库变更

### 用户表更新

用户表已更新以支持第三方登录：

```sql
-- 新增字段
ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'email';
ALTER TABLE users ADD COLUMN provider_id TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN display_name TEXT;

-- password_hash 改为可选
-- 添加唯一约束
UNIQUE(provider, provider_id)
```

### 移除的表

- `email_verification_codes` - 邮箱验证码表已删除

## 开发环境设置

### 后端 (Cloudflare Workers)

1. GitHub OAuth环境变量已经在 `wrangler.toml` 中配置好了
2. 运行数据库迁移：`npm run db:migrate`
3. 启动开发服务器：`npm run dev`

### 前端 (Vue 3)

1. 确保前端指向正确的后端API地址
2. 启动开发服务器：`npm run dev`

## 安全注意事项

1. **Client Secret 保护**: 绝不要在前端代码中暴露Client Secret
2. **HTTPS**: 生产环境必须使用HTTPS
3. **状态验证**: 实现了state参数防止CSRF攻击
4. **Token安全**: JWT token存储在localStorage中，注意XSS防护

## 故障排除

### 常见问题

1. **回调URL不匹配**: 确保GitHub应用设置中的回调URL与实际部署地址一致
2. **环境变量未设置**: 检查Cloudflare Workers中的环境变量配置
3. **权限不足**: 确保GitHub应用有足够的权限获取用户邮箱

### 调试

- 检查浏览器开发者工具的网络请求
- 查看Cloudflare Workers的日志
- 验证GitHub OAuth应用的设置

## 迁移指南

如果你有现有的邮箱注册用户：

1. 现有用户仍可使用邮箱+密码登录（如果provider='email'）
2. 用户可以通过GitHub登录来关联现有账户（相同邮箱地址）
3. 建议用户迁移到GitHub登录以获得更好的体验
