#!/usr/bin/env python3
"""Build a fresh-install schema in memory from migrations, never from a live DB."""

import argparse
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "backend" / "init.sql"
MIGRATIONS = ROOT / "backend" / "migrations"
MIGRATION_TABLE = """CREATE TABLE d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)"""


def migrated_database():
    database = sqlite3.connect(":memory:")
    database.execute("PRAGMA foreign_keys = ON")
    database.execute(MIGRATION_TABLE)
    for migration in sorted(MIGRATIONS.glob("*.sql")):
        database.executescript(migration.read_text(encoding="utf-8"))
        database.execute("INSERT INTO d1_migrations (name) VALUES (?)", (migration.name,))
        database.commit()
    assert not database.execute("PRAGMA foreign_key_check").fetchall()
    return database


def build_sql():
    database = migrated_database()
    statements = [
        """-- 临时邮箱管理系统：全新部署数据库结构（仅用于空 D1 数据库）。
-- 执行：npm run db:init / npm run db:init:local
-- 包含全部表、索引、触发器与迁移基线；后续升级使用 npm run db:migrate。
-- 不包含账户、域名、密钥或业务数据。管理员通过初始化接口创建，域名在后台添加。
-- 系统名称、价格与其他设置使用服务端默认值，首次保存后写入 system_settings。
-- 自动生成：python3 backend/scripts/build-init-sql.py；不要直接修改此文件。

-- 空库保护：拒绝覆盖已有应用表或已有迁移记录的数据库。
CREATE TABLE _fresh_install_guard (
  valid INTEGER NOT NULL CONSTRAINT fresh_install_requires_empty_database CHECK (valid = 1)
);
INSERT INTO _fresh_install_guard (valid)
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM sqlite_master
  WHERE type IN ('table', 'view')
    AND name NOT IN ('_fresh_install_guard', 'd1_migrations')
    AND name NOT GLOB 'sqlite_*'
    AND name NOT GLOB '_cf_*'
) THEN 0 ELSE 1 END;""",
        MIGRATION_TABLE.replace("CREATE TABLE", "CREATE TABLE IF NOT EXISTS", 1) + ";",
        """INSERT INTO _fresh_install_guard (valid)
SELECT CASE WHEN EXISTS (SELECT 1 FROM d1_migrations) THEN 0 ELSE 1 END;""",
    ]
    for kind, title in [("table", "业务表"), ("index", "索引"), ("trigger", "触发器")]:
        statements.append(f"-- {title}")
        for (sql,) in database.execute(
            """SELECT sql FROM sqlite_master
               WHERE type = ? AND sql IS NOT NULL
                 AND name NOT LIKE 'sqlite_%' AND name <> 'd1_migrations'
               ORDER BY name""",
            (kind,),
        ):
            statements.append(sql.rstrip(";") + ";")

    names = [row[0] for row in database.execute("SELECT name FROM d1_migrations ORDER BY id")]
    records = ",\n".join("  ('" + name.replace("'", "''") + "')" for name in names)
    statements.append(
        "-- 标记已包含的历史迁移，后续只应用新增迁移。\n"
        f"INSERT INTO d1_migrations (name) VALUES\n{records};"
    )
    statements.append("DROP TABLE _fresh_install_guard;")
    database.close()
    return "\n\n".join(statements) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Check the committed SQL without writing")
    arguments = parser.parse_args()
    sql = build_sql()
    if arguments.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != sql:
            raise SystemExit("backend/init.sql is out of date; run npm run db:schema")
        print("Fresh-install SQL matches all migrations")
    else:
        OUTPUT.write_text(sql, encoding="utf-8")
        print(f"Generated {OUTPUT.relative_to(ROOT)}")
