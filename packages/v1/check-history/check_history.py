"""
Monitoring history API.

GET /api/my/v1/check-history?monitor_id=<id>&limit=<n>
    -> recent check records for one monitor (newest first)

GET /api/my/v1/check-history?recent=failures&limit=<n>
    -> most recent failed checks across all monitors

History records live in the PostgreSQL `check_history` table (created by
the idempotent setup actions). Storage: PostgreSQL only. Each record:
{monitorId, timestamp, status, responseTime, error, url}
"""

import json


def request_data(args):
    data = dict(args) if isinstance(args, dict) else {}
    body = data.get("body")
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except Exception:
            body = {}
    merged = dict(body) if isinstance(body, dict) else {}
    ignored = {
        "body",
        "POSTGRES_URL",
        "__ow_method",
        "__ow_headers",
        "__ow_path",
        "__ow_body",
    }
    merged.update({k: v for k, v in data.items() if k not in ignored})
    return merged


def format_timestamp(value):
    if value is None:
        return None
    try:
        return value.isoformat().replace("+00:00", "Z")
    except Exception:
        return str(value)


def row_to_record(row):
    return {
        "monitorId": row[1],
        "timestamp": format_timestamp(row[2]),
        "status": row[3],
        "responseTime": row[4],
        "error": row[5],
        "url": row[6],
    }


def get_monitor_history(conn, monitor_id, limit):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, monitor_id, timestamp, status, response_time, error, url "
            "FROM check_history WHERE monitor_id = %s "
            "ORDER BY timestamp DESC, id DESC LIMIT %s",
            (monitor_id, limit),
        )
        rows = cur.fetchall()
    return [row_to_record(r) for r in rows]


def get_recent_failures(conn, limit):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, monitor_id, timestamp, status, response_time, error, url "
            "FROM check_history WHERE status = 'offline' "
            "ORDER BY timestamp DESC, id DESC LIMIT %s",
            (limit,),
        )
        rows = cur.fetchall()
    return [row_to_record(r) for r in rows]


def main(args, ctx=None):
    if not ctx or not hasattr(ctx, "POSTGRESQL"):
        return {"ok": False, "error": "Database not configured"}

    conn = ctx.POSTGRESQL
    try:
        data = request_data(args)
        method = (args.get("__ow_method") or args.get("method") or "GET").upper()
        if method != "GET":
            return {"ok": False, "error": f"Method {method} not supported"}

        recent = data.get("recent")
        try:
            limit = int(data.get("limit") or (5 if recent == "failures" else 50))
        except (TypeError, ValueError):
            limit = 5 if recent == "failures" else 50

        if recent == "failures":
            return {"ok": True, "failures": get_recent_failures(conn, limit)}

        monitor_id = data.get("monitor_id") or data.get("monitorId") or data.get("id")
        if monitor_id in (None, ""):
            return {
                "ok": False,
                "error": "monitor_id is required, or use recent=failures",
            }
        try:
            monitor_id_int = int(monitor_id)
        except (TypeError, ValueError):
            return {"ok": False, "error": "monitor_id must be an integer"}

        return {
            "ok": True,
            "monitorId": monitor_id_int,
            "history": get_monitor_history(conn, monitor_id_int, limit),
        }
    finally:
        # The generated wrapper opens a fresh connection per invocation and
        # never closes it; release it so server slots are not held until
        # the container is garbage collected.
        try:
            conn.close()
        except Exception:
            pass
