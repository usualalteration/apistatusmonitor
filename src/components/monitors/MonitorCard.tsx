import { Globe, Trash2, HelpCircle, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Monitor } from "@/types/monitor";

interface MonitorCardProps {
  monitor: Monitor;
  onDelete: (id: number) => void;
  onCheck: (id: number) => void;
  isChecking: boolean;
}

const statusStyles: Record<
  Monitor["status"],
  { badge: string; dot: string }
> = {
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

const statusLabel: Record<Monitor["status"], string> = {
  unknown: "Unknown",
  online: "Online",
  offline: "Offline",
};

const formatLastCheck = (iso: string | null): string => {
  if (!iso) return "Never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
};

const MonitorCard = ({
  monitor,
  onDelete,
  onCheck,
  isChecking,
}: MonitorCardProps) => {
  const style = statusStyles[monitor.status];

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Globe className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">
              {monitor.name}
            </h3>
            <p className="truncate text-sm text-muted-foreground">
              {monitor.url}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(monitor.id)}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Delete monitor ${monitor.name}`}
          title="Delete monitor"
        >
          <Trash2 className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.badge}`}
        >
          {monitor.status === "unknown" ? (
            <HelpCircle className="h-3.5 w-3.5" />
          ) : (
            <span className={`h-2 w-2 rounded-full ${style.dot}`} />
          )}
          Status: {statusLabel[monitor.status]}
        </span>
        <span className="text-xs text-muted-foreground">
          Last check: {formatLastCheck(monitor.lastCheck)}
        </span>
        {monitor.responseTime !== null && (
          <span className="text-xs text-muted-foreground">
            Response: {monitor.responseTime} ms
          </span>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => onCheck(monitor.id)}
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
  );
};

export default MonitorCard;