import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Globe,
  Loader2,
  Zap,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMonitors } from "@/contexts/MonitorsContext";
import {
  fetchMonitorHistory,
  type HistoryRecord,
} from "@/lib/history";
import ResponseTimeChart from "@/components/monitors/ResponseTimeChart";
import HistoryTable from "@/components/monitors/HistoryTable";

const statusStyles: Record<string, { badge: string; dot: string }> = {
  unknown: {
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  online: {
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  offline: {
    badge: "bg-red-500/10 text-red-600 dark:text-red-400",
    dot: "bg-red-500",
  },
};

const statusLabel: Record<string, string> = {
  unknown: "Unknown",
  online: "Online",
  offline: "Offline",
};

const formatLastCheck = (iso: string | null): string => {
  if (!iso) return "Never";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

const MonitorDetails = () => {
  const { id } = useParams();
  const monitorId = Number(id);
  const { monitors, loading, checkMonitor, checkingId } = useMonitors();
  const monitor = monitors.find((m) => m.id === monitorId);

  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!Number.isFinite(monitorId)) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      setHistory(await fetchMonitorHistory(monitorId));
    } catch (e) {
      setHistoryError(
        e instanceof Error ? e.message : "Failed to load history.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [monitorId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, monitor?.lastCheck]);

  const handleCheck = async () => {
    await checkMonitor(monitorId);
    await loadHistory();
  };

  const isChecking = checkingId === monitorId;
  const style = monitor ? statusStyles[monitor.status] : statusStyles.unknown;

  const onlineCount = history.filter((h) => h.status === "online").length;
  const uptime =
    history.length > 0 ? (onlineCount / history.length) * 100 : null;

  if (loading) {
    return (
      <div className="flex items-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm">Loading monitor…</span>
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="space-y-4">
        <Link
          to="/monitors"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to monitors
        </Link>
        <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold">Monitor not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This monitor may have been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/monitors"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to monitors
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Globe className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight">
                {monitor.name}
              </h1>
              <p className="truncate text-sm text-muted-foreground">
                {monitor.url}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${style.badge}`}
                >
                  {monitor.status === "unknown" ? (
                    <HelpCircle className="h-3.5 w-3.5" />
                  ) : (
                    <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                  )}
                  Status: {statusLabel[monitor.status]}
                </span>
                <span className="text-muted-foreground">
                  Last check: {formatLastCheck(monitor.lastCheck)}
                </span>
                {monitor.responseTime !== null && (
                  <span className="text-muted-foreground">
                    Response: {monitor.responseTime} ms
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCheck}
            disabled={isChecking}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isChecking ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking…
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5" />
                Check Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Uptime + chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-1">
          <p className="text-sm font-medium text-muted-foreground">
            Uptime (last {history.length} check{history.length === 1 ? "" : "s"})
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
            {uptime === null ? "—" : `${uptime.toFixed(1)}%`}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {onlineCount} online / {history.length} total
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold">Response time</h2>
          <div className="mt-3">
            {historyLoading ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <ResponseTimeChart records={history} />
            )}
          </div>
        </div>
      </div>

      {/* History table */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Check history</h2>
        <div className="mt-3">
          {historyLoading ? (
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="ml-2 text-sm">Loading history…</span>
            </div>
          ) : historyError ? (
            <p className="text-sm text-destructive">{historyError}</p>
          ) : (
            <HistoryTable records={history} />
          )}
        </div>
      </div>
    </div>
  );
};

export default MonitorDetails;