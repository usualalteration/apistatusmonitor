import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useMonitors } from "@/contexts/MonitorsContext";
import { fetchRecentFailures, type HistoryRecord } from "@/lib/history";

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

const RecentFailures = () => {
  const { monitors } = useMonitors();
  const [failures, setFailures] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchRecentFailures(5)
      .then((records) => {
        if (active) setFailures(records);
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load failures.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [monitors]);

  const nameFor = (monitorId: number) =>
    monitors.find((m) => m.id === monitorId)?.name ?? `Monitor #${monitorId}`;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <h2 className="text-base font-semibold">Recent failures</h2>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="flex items-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="ml-2 text-sm">Loading…</span>
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : failures.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recent failures recorded.
          </p>
        ) : (
          <ul className="divide-y">
            {failures.map((f, i) => (
              <li
                key={`${f.monitorId}-${f.timestamp}-${i}`}
                className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    to={`/monitors/${f.monitorId}`}
                    className="text-sm font-medium text-foreground hover:underline"
                  >
                    {nameFor(f.monitorId)}
                  </Link>
                  {f.error && (
                    <p className="truncate text-xs text-red-600 dark:text-red-400">
                      {f.error}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatTime(f.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default RecentFailures;