"""
Idempotent database setup for the monitors and check_history tables.

Run via `ops ide setup` after the watcher has deployed the action.
"""

HISTORY_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS check_history (
    id SERIAL PRIMARY KEY,
    monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL,
    response_time INTEGER,
    error TEXT,
    url TEXT
)
"""

HISTORY_INDEXES_SQL = (
    "CREATE INDEX IF NOT EXISTS check_history_monitor_time "
    "ON check_history (monitor_id, timestamp DESC)",
    "CREATE INDEX IF NOT EXISTS check_history_status_time "
    "ON check_history (status, timestamp DESC)",
)


def main(args, ctx=None):
    if not ctx or not hasattr(ctx, "POSTGRESQL"):
        return {"ok": False, "error": "PostgreSQL not configured"}

    conn = ctx.POSTGRESQL
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS monitors (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    url TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'unknown',
                    response_time INTEGER,
                    last_check TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                )
                """
            )
            cur.execute(HISTORY_TABLE_SQL)
            for statement in HISTORY_INDEXES_SQL:
                cur.execute(statement)
        conn.commit()
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        return {"ok": False, "error": f"Setup failed: {e}"}
    finally:
        try:
            conn.close()
        except Exception:
            pass

    return {"ok": True, "message": "monitors and check_history tables ready"}
