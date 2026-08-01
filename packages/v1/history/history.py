"""
Monitoring history API.

GET /api/my/v1/history?monitor_id=<id>&limit=<n>
    -> recent check records for one monitor (newest first)

GET /api/my/v1/history?recent=failures&limit=<n>
    -> most recent failed checks across all monitors

Each record: {monitorId, timestamp, status, responseTime, error, url}
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
        "MONGODB_URI",
        "__ow_method",
        "__ow_headers",
        "__ow_path",
        "__ow_body",
    }
    merged.update({k: v for k, v in data.items() if k not in ignored})
    return merged


def to_record(doc):
    return {
        "monitorId": doc.get("monitor_id"),
        "timestamp": doc.get("timestamp"),
        "status": doc.get("status"),
        "responseTime": doc.get("response_time"),
        "error": doc.get("error"),
        "url": doc.get("url"),
    }


def get_monitor_history(db, monitor_id, limit):
    docs = (
        db["check_history"]
        .find({"monitor_id": monitor_id})
        .sort("timestamp", -1)
        .limit(limit)
    )
    return [to_record(d) for d in docs]


def get_recent_failures(db, limit):
    docs = (
        db["check_history"]
        .find({"status": "offline"})
        .sort("timestamp", -1)
        .limit(limit)
    )
    return [to_record(d) for d in docs]


def main(args, ctx=None):
    if not ctx or not hasattr(ctx, "MONGODB"):
        return {"ok": False, "error": "MongoDB not configured"}

    db = ctx.MONGODB
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
        return {"ok": True, "failures": get_recent_failures(db, limit)}

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
        "history": get_monitor_history(db, monitor_id_int, limit),
    }