"""
Real monitoring check.

POST /api/my/v1/check {id}  or {url}

- Looks up the monitor by id (or uses url directly).
- Performs a real HTTP GET against the URL (stdlib urllib).
- Measures response time in milliseconds.
- Detects online/offline from the response.
- Persists the result to PostgreSQL.
- Caches the latest status in Redis.
- Returns {ok, id, url, status, responseTime, timestamp}.
"""

import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone


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
        "REDIS_URL",
        "REDIS_PREFIX",
        "__ow_method",
        "__ow_headers",
        "__ow_path",
        "__ow_body",
    }
    merged.update({k: v for k, v in data.items() if k not in ignored})
    return merged


def is_valid_url(value):
    if not isinstance(value, str) or not value.strip():
        return False
    from urllib.parse import urlparse

    parsed = urlparse(value.strip())
    return parsed.scheme in ("http", "https") and bool(parsed.netloc)


def fetch_url(url, timeout=10):
    """Perform a real HTTP GET and return (online, response_time_ms, status_code)."""
    start = time.monotonic()
    status_code = None
    try:
        req = urllib.request.Request(
            url,
            method="GET",
            headers={"User-Agent": "StatusPulse/0.1 (+monitoring)"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status_code = resp.getcode()
            # Drain a small amount of the body so the response is fully acknowledged.
            resp.read(1024)
        elapsed_ms = int((time.monotonic() - start) * 1000)
        online = 200 <= (status_code or 0) < 400
        return online, elapsed_ms, status_code
    except urllib.error.HTTPError as e:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        status_code = e.code
        # Non-2xx/3xx HTTP responses mean the endpoint is reachable but not healthy.
        online = 200 <= status_code < 400
        return online, elapsed_ms, status_code
    except Exception:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        return False, elapsed_ms, status_code


def redis_key(ctx, name):
    return f"{getattr(ctx, 'REDIS_PREFIX', '') or ''}{name}"


def lookup_monitor(conn, monitor_id):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, name, url FROM monitors WHERE id = %s",
            (monitor_id,),
        )
        row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "name": row[1], "url": row[2]}


def persist_result(conn, monitor_id, status, response_time_ms, timestamp):
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE monitors SET status = %s, response_time = %s, last_check = %s "
            "WHERE id = %s",
            (status, response_time_ms, timestamp, monitor_id),
        )
    conn.commit()


def cache_result(ctx, monitor_id, payload):
    redis = getattr(ctx, "REDIS", None)
    if redis is None:
        return
    key = redis_key(ctx, f"monitor:{monitor_id}:status")
    try:
        redis.set(key, json.dumps(payload), ex=3600)
    except Exception:
        # Caching is best-effort; the persisted DB row remains authoritative.
        pass


def main(args, ctx=None):
    if not ctx or not hasattr(ctx, "POSTGRESQL"):
        return {"ok": False, "error": "Database not configured"}

    conn = ctx.POSTGRESQL
    data = request_data(args)

    monitor_id = data.get("id") or data.get("monitor_id") or data.get("monitorId")
    url = data.get("url") or data.get("monitor_url") or data.get("monitorUrl")

    monitor = None
    if monitor_id not in (None, ""):
        try:
            monitor_id_int = int(monitor_id)
        except (TypeError, ValueError):
            return {"ok": False, "error": "Monitor id must be an integer."}
        monitor = lookup_monitor(conn, monitor_id_int)
        if not monitor:
            return {"ok": False, "error": "Monitor not found."}
        url = monitor["url"]
        monitor_id = monitor["id"]
    else:
        monitor_id = None

    if not url or not str(url).strip():
        return {"ok": False, "error": "Monitor URL is required."}
    url = str(url).strip()
    if not is_valid_url(url):
        return {"ok": False, "error": "A valid http or https URL is required."}

    online, response_time_ms, _status_code = fetch_url(url)
    status = "online" if online else "offline"
    timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    if monitor_id is not None:
        ts_db = datetime.now(timezone.utc)
        persist_result(conn, monitor_id, status, response_time_ms, ts_db)
        cache_result(
            ctx,
            monitor_id,
            {
                "status": status,
                "responseTime": response_time_ms,
                "timestamp": timestamp,
            },
        )

    return {
        "ok": True,
        "id": monitor_id,
        "url": url,
        "status": status,
        "responseTime": response_time_ms,
        "timestamp": timestamp,
    }