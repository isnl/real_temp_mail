#!/usr/bin/env python3
"""Verify fresh SQL parity, constraints, and refusal to overwrite existing data."""

from pathlib import Path
import runpy
import sqlite3

ROOT = Path(__file__).resolve().parents[2]
builder = runpy.run_path(str(ROOT / "backend/scripts/build-init-sql.py"))
sql = (ROOT / "backend/init.sql").read_text(encoding="utf-8")


def connect():
    database = sqlite3.connect(":memory:")
    database.execute("PRAGMA foreign_keys = ON")
    return database


def schema(database):
    return database.execute(
        """SELECT type, name, sql FROM sqlite_master
           WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type, name"""
    ).fetchall()


def expect_rejection(database, statement, message):
    try:
        database.executescript(statement)
    except sqlite3.IntegrityError:
        return
    raise AssertionError(message)


fresh = connect()
fresh.executescript(sql)
upgraded = builder["migrated_database"]()
assert schema(fresh) == schema(upgraded), "Fresh SQL must preserve every table, index and trigger"
assert fresh.execute("SELECT name FROM d1_migrations ORDER BY id").fetchall() == upgraded.execute(
    "SELECT name FROM d1_migrations ORDER BY id"
).fetchall(), "All bundled migrations must be marked as applied"

tables = [row[0] for row in fresh.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
)]
for table in tables:
    if table != "d1_migrations":
        assert fresh.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0] == 0, table

fresh.executescript("""
INSERT INTO users (email, password_hash) VALUES ('fresh@example.test', 'fixture');
INSERT INTO domains (domain) VALUES ('example.test');
INSERT INTO temp_emails (user_id, email, domain_id, creation_key)
VALUES (1, 'inbox@example.test', 1, 'create-1');
INSERT INTO emails (temp_email_id, sender, dedup_key) VALUES (1, 'sender@example.test', 'delivery-1');
INSERT INTO redeem_codes (code, quota, max_uses) VALUES ('FRESH-CODE', 5, 2);
INSERT INTO redeem_code_usages (redeem_code_id, user_id, quota_amount) VALUES (1, 1, 5);
""")
assert fresh.execute("SELECT used_count FROM redeem_codes").fetchone()[0] == 1
expect_rejection(fresh, """
INSERT INTO redeem_code_usages (redeem_code_id, user_id, quota_amount) VALUES (1, 1, 5);
""", "One user must not redeem the same code twice")
expect_rejection(fresh, """
INSERT INTO emails (temp_email_id, sender, dedup_key) VALUES (1, 'sender@example.test', 'delivery-1');
""", "Email retries must remain idempotent")
expect_rejection(fresh, """
INSERT INTO user_quota_balances (user_id, quota_type, amount, source)
VALUES (1, 'permanent', -1, 'register');
""", "Negative balances must be rejected")
expect_rejection(fresh, """
INSERT INTO temp_emails (user_id, email, domain_id) VALUES (999, 'invalid@example.test', 1);
""", "Foreign keys must remain enforced")
assert fresh.execute(
    "SELECT ABS((julianday(created_at) - julianday(CURRENT_TIMESTAMP)) * 86400) < 5 FROM users"
).fetchone()[0] == 1, "New timestamps must use UTC"

# Existing tables and data must be rejected before any application writes.
before = {table: fresh.execute(f'SELECT * FROM "{table}"').fetchall() for table in tables}
expect_rejection(fresh, sql, "Repeated initialization must fail")
assert before == {table: fresh.execute(f'SELECT * FROM "{table}"').fetchall() for table in tables}

partial = connect()
partial.executescript("CREATE TABLE legacy_data (value TEXT); INSERT INTO legacy_data VALUES ('keep');")
expect_rejection(partial, sql, "An unrecognized populated schema must be rejected")
assert partial.execute("SELECT value FROM legacy_data").fetchall() == [("keep",)]
assert partial.execute("SELECT COUNT(*) FROM sqlite_master WHERE name = 'users'").fetchone()[0] == 0

# Wrangler may have created its empty migration table before SQL import.
empty_history = connect()
empty_history.execute(builder["MIGRATION_TABLE"])
empty_history.executescript(sql)
assert schema(empty_history) == schema(upgraded)

history_only = connect()
history_only.execute(builder["MIGRATION_TABLE"])
history_only.execute("INSERT INTO d1_migrations (name) VALUES ('old.sql')")
expect_rejection(history_only, sql, "A nonempty migration history must not be baselined again")
assert history_only.execute("SELECT name FROM d1_migrations").fetchall() == [("old.sql",)]

fresh.execute("DELETE FROM users WHERE id = 1")
assert fresh.execute("SELECT COUNT(*) FROM temp_emails").fetchone()[0] == 0
assert fresh.execute("SELECT COUNT(*) FROM emails").fetchone()[0] == 0
assert not fresh.execute("PRAGMA foreign_key_check").fetchall()
assert fresh.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
for database in [fresh, upgraded, partial, empty_history, history_only]:
    database.close()
print("PASS: fresh schema parity, migration baseline, empty data, constraints, UTC and overwrite guards")
