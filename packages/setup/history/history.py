"""
History storage setup.

The `check_history` PostgreSQL table and its indexes are created by the
idempotent `setup/database` action (PostgreSQL only — the app no longer
uses MongoDB). This action verifies that history storage is ready when a
PostgreSQL connection is available and otherwise reports that setup is
handled by `setup/database`, so `ops ide setup` stays green in every
environment.
"""


def main(args, ctx=None):
    conn = getattr(ctx, "POSTGRESQL", None) if ctx else None
    if conn is None:
        return {
            "ok": True,
            "message": "check_history is created by setup/database (PostgreSQL)",
        }

    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_name = 'check_history'"
            )
            exists = cur.fetchone() is not None
        message = (
            "check_history table ready"
            if exists
            else "check_history missing; run setup/database"
        )
        return {"ok": exists, "message": message}
    except Exception as e:
        return {"ok": False, "error": f"Setup failed: {e}"}
    finally:
        try:
            conn.close()
        except Exception:
            pass
