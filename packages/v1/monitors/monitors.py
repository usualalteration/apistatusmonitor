"""
Monitors CRUD API.

GET    /api/my/v1/monitors          -> list all monitors
POST   /api/my/v1/monitors          -> create a monitor {name, url}
DELETE /api/my/v1/monitors/<id>     -> delete a monitor (id may also be in body)
"""

import json

VALID_STATUSES = {"unknown", "online", "offline"}


def request_data(args):
    data = dict(args) if isinstance(args, dict) else {}
    body = data.get("body")
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except Exception:
            body = {}
    merged = dict(body) if isinstance(body, dict) else {}
    ignored = {"body", "POSTGRES_URL", "__ow_method", "__ow_headers", "__ow_path", "__ow_body"}
    merged.update({k: v for k, v in data.items() if k not in ignored})
    return merged


def request_method(args):
    return (args.get("__ow_method") or args.get("method") or "GET").upper()


def request_route_id(args, data):
    for key in ("id", "monitor_id", "monitorId"):
        value = data.get(key)
        if value not in (None, ""):
            return str(value)

    raw_path = str(args.get("__ow_path") or args.get("path") or "").strip("/")
    if not raw_path:
        return ""

    parts = [part for part in raw_path.split("/") if part]
    if not parts:
        return ""

    if "monitors" in parts:
        index = parts.index("monitors")
        if index + 1 < len(parts):
            return parts[index + 1]

    return parts[-1]


def is_valid_url(value):
    if not isinstance(value, str) or not value.strip():
        return False
    from urllib.parse import urlparse

    parsed = urlparse(value.strip())
    return parsed.scheme in ("http", "https") and bool(parsed.netloc)


def row_to_monitor(row):
    return {
        "id": row[0],
        "name": row[1],
        "url": row[2],
        "status": row[3] if row[3] in VALID_STATUSES else "unknown",
        "responseTime": int(row[4]) if row[4] is not None else None,
        "lastCheck": row[5].isoformat() if row[5] is not None else None,
        "createdAt": row[6].isoformat() if row[6] is not None else None,
    }


def list_monitors(conn):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, name, url, status, response_time, last_check, created_at "
            "FROM monitors ORDER BY id DESC"
        )
        rows = cur.fetchall()
    return {"ok": True, "monitors": [row_to_monitor(r) for r in rows]}


def create_monitor(conn, data):
    name = (data.get("name") or "").strip()
    url = (data.get("url") or "").strip()

    if not name:
        return {"ok": False, "error": "Name is required."}
    if len(name) > 80:
        return {"ok": False, "error": "Name must be 80 characters or fewer."}
    if not url:
        return {"ok": False, "error": "URL is required."}
    if not is_valid_url(url):
        return {"ok": False, "error": "A valid http or https URL is required."}

    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO monitors (name, url) VALUES (%s, %s) "
            "RETURNING id, name, url, status, response_time, last_check, created_at",
            (name, url),
        )
        row = cur.fetchone()
    conn.commit()
    return {"ok": True, "monitor": row_to_monitor(row)}


def delete_monitor(conn, monitor_id):
    if not monitor_id:
        return {"ok": False, "error": "Monitor id is required."}
    try:
        monitor_id_int = int(monitor_id)
    except (TypeError, ValueError):
        return {"ok": False, "error": "Monitor id must be an integer."}

    with conn.cursor() as cur:
        cur.execute("DELETE FROM monitors WHERE id = %s", (monitor_id_int,))
        deleted = cur.rowcount
    conn.commit()

    if deleted == 0:
        return {"ok": False, "error": "Monitor not found."}
    return {"ok": True, "deleted": monitor_id_int}


def main(args, ctx=None):
    if not ctx or not hasattr(ctx, "POSTGRESQL"):
        return {"ok": False, "error": "Database not configured"}

    conn = ctx.POSTGRESQL
    method = request_method(args)
    data = request_data(args)

    if method == "GET":
        return list_monitors(conn)
    if method == "POST":
        return create_monitor(conn, data)
    if method == "DELETE":
        return delete_monitor(conn, request_route_id(args, data))

    return {"ok": False, "error": f"Method {method} not supported"}