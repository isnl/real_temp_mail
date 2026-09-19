# 全新部署指南

本指南适用于拿到源码后部署一个独立实例。前端、API 和邮件处理共用一个 Cloudflare Worker，数据库使用 D1。

全新数据库只需导入 **`backend/init.sql`**。该文件包含完整表结构、索引、触发器及迁移记录，不需要逐个导入 `backend/migrations/` 中的文件。SQL 不含现成账号、域名、密钥或演示业务数据。

## 1. 安装与配置

准备 Node.js 20.19+ 或 22.12+、npm 10+，以及一个已托管域名的 Cloudflare 账号。在源码根目录执行：

```bash
npm ci
npx wrangler login
cp wrangler.example.toml wrangler.toml
npx wrangler d1 create my-temp-mail-db
```

将创建数据库后显示的 `database_id` 填入 `wrangler.toml`，并修改以下配置：

| 配置 | 填写内容 |
| --- | --- |
| `name` | 自己的 Worker 名称，例如 `my-temp-mail` |
| `routes[].pattern` | 站点域名，例如 `mail.example.com`，不含协议或路径 |
| `FRONTEND_DOMAIN` | 与站点域名一致，用于站点链接和固定的 GitHub 授权回调 |
| `database_name` | 刚创建的 D1 数据库名称 |
| `database_id` | 刚创建的 D1 数据库 ID |

保留 `binding = "DB"`、静态资源、迁移目录和定时任务配置。使用模板填写自己的部署信息，不要复用仓库中现有实例的域名和数据库绑定。

## 2. 导入完整 SQL

对刚创建的空数据库执行一次：

```bash
npm run db:init
```

等价命令：

```bash
npx wrangler d1 execute DB --remote --file backend/init.sql
```

验证迁移基线：

```bash
npx wrangler d1 migrations list DB --remote
```

预期没有待应用的迁移。初始化 SQL 已包含当前全部迁移的最终结构，也已经登记迁移文件名；后续发布只应用新增迁移。

`db:init` 仅用于空库，检测到已有应用表或迁移记录会拒绝导入。已有实例应备份后使用 `npm run db:migrate` 升级。

## 3. 设置密钥并部署

分别生成两个不同的随机值，每个至少 32 个字符，并妥善保存。例如每次运行 `openssl rand -hex 32` 生成一个值。通过交互输入设置，不写入源码或 SQL：

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put ADMIN_SETUP_TOKEN
npm run deploy
```

如果 Wrangler 提示 Worker 尚不存在，按提示创建与配置中同名的 Worker。`JWT_SECRET` 用于登录令牌和敏感配置加密；`ADMIN_SETUP_TOKEN` 仅用于首次创建管理员。

部署会构建前端、检查后端类型并上传 Worker 和静态资源，同时绑定模板中配置的站点域名。验证：

```bash
curl https://mail.example.com/api/health
curl https://mail.example.com/api/auth/bootstrap-status
```

后续示例中的 `mail.example.com` 均需替换为自己的站点域名。

## 4. 创建管理员

当 `bootstrap-status` 返回 `required: true` 时，调用一次：

```bash
curl https://mail.example.com/api/auth/bootstrap \
  --request POST \
  --header 'Content-Type: application/json' \
  --data '{
    "setupToken": "填写刚设置的 ADMIN_SETUP_TOKEN",
    "username": "admin",
    "email": "admin@example.com",
    "password": "替换为自己的高强度密码",
    "confirmPassword": "再次填写相同密码"
  }'
```

该系统没有默认管理员密码。密码至少 8 位；建议使用密码管理器生成。确认能够登录后删除一次性初始化令牌：

```bash
npx wrangler secret delete ADMIN_SETUP_TOKEN
```

## 5. 配置站点与收信

进入后台“系统设置”：

- **站点设置**：包含站点信息、配额策略、价格套餐和常见问题，各分组独立保存。可维护系统名称、管理员联系邮箱、页脚展示开关和新用户默认配额。
- **价格套餐 / 常见问题分组**：在“站点设置”中维护套餐、权益、按钮和问答；按钮支持仅展示文字或跳转到指定链接。套餐和常见问题分别保存，不会一起提交未完成的修改。
- **账号与安全**：分别保存账号与访问、第三方登录、人机验证三个分组。

系统名称、套餐等初始内容由服务端默认配置提供，首次保存后写入数据库。人机验证和第三方登录默认关闭，联系邮箱默认不展示。

收信配置：

1. 在 Cloudflare 为自己的收信域名启用 **Email Routing**，按提示添加并验证 DNS 记录。
2. 将 Catch-all 或指定邮件路由的目标类型设置为 **Worker**，选择本次部署的 Worker。
3. 在后台“域名管理”添加并启用该收信域名。收信域名可与站点域名不同，但必须和 Email Routing 实际接管的域名一致。
4. 注册测试用户、创建临时邮箱，从外部邮箱向该地址发信，确认收件箱能够收到邮件。

如需 GitHub 登录，在 GitHub 创建 OAuth App，回调地址填写后台提供的只读地址：`https://mail.example.com/api/auth/github/callback`，并在“第三方登录”分组配置应用标识（Client ID）与应用密钥（Client Secret）。

如需人机验证，在 Cloudflare Turnstile 添加站点域名，将 Site Key 填到“站点密钥”、Secret Key 填到“验证密钥”，再开启对应场景。

## 本地运行

```bash
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars，填写两个不同的本地随机密钥。
npm run db:init:local
npm run dev
```

访问 `http://localhost:8787`，使用该地址调用同样的管理员初始化接口。本地 D1 与远程 D1 分开，`db:init:local` 不会修改线上数据。

模板中的 `dev.host` 和 `.dev.vars` 中的 `FRONTEND_DOMAIN` 均使用 `localhost:8787`；如需改端口，应同步修改这两处与 `dev.port`，保证授权回调使用同一个地址。

## 后续更新与源码维护

已有实例更新前先导出 D1 备份：

```bash
npx wrangler d1 export DB --remote --output backup.sql
npm ci
npm run db:migrate
npm run deploy
```

发布新版源码时，保留旧迁移并添加新的迁移文件，然后更新完整初始化 SQL：

```bash
npm run db:schema
npm run db:check
```

这两个维护命令需要 Python 3，使用内置 SQLite，在内存中运行历史迁移，不连接线上数据库。新买家可以直接使用随源码附带的 `backend/init.sql`，无须安装 Python 或重新生成 SQL。

交付源码时提供配置模板和此指南；排除 `.dev.vars`、本地环境文件、`.wrangler/`、D1 备份、`node_modules/` 及自己的部署绑定。系统不会在初始化 SQL 中分发任何现有实例的数据。
