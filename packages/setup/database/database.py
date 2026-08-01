"""
Idempotent database setup for the monitors table.

Run via `ops ide setup` after the watcher has deployed the action.
"""


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
        conn.commit()
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        return {"ok": False, "error": f"Setup failed: {e}"}

    return {"ok": True, "message": "monitors table ready"}