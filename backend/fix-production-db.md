# 修复生产环境数据库缺失表的问题

## 问题描述
生产环境中缺失 `user_quota_balances` 表，导致接口报错：
```
D1_ERROR: no such table: user_quota_balances: SQLITE_ERROR
```

## 解决方案

### 方法一：直接执行修复脚本（推荐）

在 `backend` 目录下执行以下命令：

```bash
# 执行修复脚本
wrangler d1 execute oooo-mail --file=fix-missing-table.sql --env=production
```

### 方法二：逐个执行迁移文件

如果需要完整的迁移历史，可以按顺序执行所有迁移文件：

```bash
# 进入 backend 目录
cd backend

# 执行迁移文件（按顺序）
wrangler d1 execute oooo-mail --file=migrations/0003_update_table_defaults.sql --env=production
wrangler d1 execute oooo-mail --file=migrations/0004_add_checkin_and_quota_logs.sql --env=production
wrangler d1 execute oooo-mail --file=migrations/0005_fix_quota_logic.sql --env=production
wrangler d1 execute oooo-mail --file=migrations/0006_redeem_code_multi_use.sql --env=production
wrangler d1 execute oooo-mail --file=migrations/0007_add_announcements.sql --env=production
wrangler d1 execute oooo-mail --file=migrations/0008_quota_expiration_system.sql --env=production
wrangler d1 execute oooo-mail --file=migrations/0009_email_verification_codes.sql --env=production
```

### 方法三：使用自动化脚本

```bash
# 给脚本执行权限
chmod +x run-migrations.sh

# 执行迁移脚本
./run-migrations.sh
```

## 验证修复结果

执行以下命令验证表是否创建成功：

```bash
# 检查表是否存在
wrangler d1 execute oooo-mail --command="SELECT name FROM sqlite_master WHERE type='table' AND name='user_quota_balances';" --env=production

# 检查表结构
wrangler d1 execute oooo-mail --command="PRAGMA table_info(user_quota_balances);" --env=production

# 检查数据是否迁移成功
wrangler d1 execute oooo-mail --command="SELECT COUNT(*) as total_records FROM user_quota_balances;" --env=production
```

## 注意事项

1. **备份数据**：在执行迁移前，建议先备份生产数据库
2. **测试环境**：建议先在开发环境测试迁移脚本
3. **监控日志**：执行后监控应用日志，确保没有新的错误
4. **数据一致性**：执行后检查用户配额数据是否一致

## 常见问题

### Q: 如果迁移过程中出错怎么办？
A: 大部分 SQL 语句使用了 `IF NOT EXISTS` 或 `INSERT OR IGNORE`，可以安全重复执行。

### Q: 如何回滚迁移？
A: 由于涉及数据迁移，建议在执行前做好数据备份。如需回滚，需要手动删除相关表和字段。

### Q: 迁移会影响现有功能吗？
A: 迁移主要是添加新表和字段，不会删除现有数据，对现有功能影响最小。

## 执行后检查清单

- [ ] `user_quota_balances` 表已创建
- [ ] 相关索引已创建
- [ ] 现有配额数据已迁移到新表
- [ ] 应用接口不再报错
- [ ] 用户配额显示正常
- [ ] 签到功能正常
- [ ] 兑换码功能正常
