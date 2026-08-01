"""
Idempotent MongoDB setup for check history.

Creates an index on the check_history collection so per-monitor history
queries and recent-failure lookups are efficient.

Run via `ops ide setup` after the watcher has deployed the action.
"""


def main(args, ctx=None):
    if not ctx or not hasattr(ctx, "MONGODB"):
        return {"ok": False, "error": "MongoDB not configured"}

    db = ctx.MONGODB
    try:
        collection = db["check_history"]
        collection.create_index(
            [("monitor_id", 1), ("timestamp", -1)],
            name="monitor_time",
        )
    except Exception as e:
        return {"ok": False, "error": f"Setup failed: {e}"}

    return {"ok": True, "message": "check_history index ready"}