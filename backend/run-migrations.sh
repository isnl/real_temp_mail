#!/bin/bash

# 数据库迁移执行脚本
# 用于在生产环境中执行所有迁移文件

echo "开始执行数据库迁移..."

# 检查 wrangler 是否安装
if ! command -v wrangler &> /dev/null; then
    echo "错误: wrangler 未安装，请先安装 wrangler"
    exit 1
fi

# 数据库名称（从 wrangler.toml 中获取）
DB_NAME="oooo-mail"

# 迁移文件目录
MIGRATIONS_DIR="./migrations"

# 检查迁移目录是否存在
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "错误: 迁移目录 $MIGRATIONS_DIR 不存在"
    exit 1
fi

# 获取所有迁移文件并按顺序排序
MIGRATION_FILES=$(ls $MIGRATIONS_DIR/*.sql | sort)

echo "发现以下迁移文件:"
for file in $MIGRATION_FILES; do
    echo "  - $(basename $file)"
done

echo ""
read -p "确认执行这些迁移吗? (y/N): " confirm

if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
    echo "迁移已取消"
    exit 0
fi

echo ""
echo "开始执行迁移..."

# 执行每个迁移文件
for migration_file in $MIGRATION_FILES; do
    filename=$(basename $migration_file)
    echo "正在执行: $filename"
    
    # 使用 wrangler d1 execute 执行 SQL 文件
    if wrangler d1 execute $DB_NAME --file="$migration_file" --env=production; then
        echo "✅ $filename 执行成功"
    else
        echo "❌ $filename 执行失败"
        echo "迁移过程中断，请检查错误并手动修复"
        exit 1
    fi
    
    echo ""
done

echo "🎉 所有迁移执行完成！"

# 验证关键表是否存在
echo ""
echo "验证关键表结构..."

# 检查 user_quota_balances 表是否存在
echo "检查 user_quota_balances 表..."
if wrangler d1 execute $DB_NAME --command="SELECT name FROM sqlite_master WHERE type='table' AND name='user_quota_balances';" --env=production | grep -q "user_quota_balances"; then
    echo "✅ user_quota_balances 表存在"
else
    echo "❌ user_quota_balances 表不存在"
fi

# 检查表结构
echo "检查表结构..."
wrangler d1 execute $DB_NAME --command="PRAGMA table_info(user_quota_balances);" --env=production

echo ""
echo "迁移验证完成！"
