import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HistoryRecord } from "@/lib/history";

interface HistoryTableProps {
  records: HistoryRecord[];
}

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

const HistoryTable = ({ records }: HistoryTableProps) => {
  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No checks recorded yet for this monitor.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2 font-medium">Time</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Response</th>
            <th className="px-3 py-2 font-medium">Error</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {records.map((r, i) => (
            <tr key={`${r.timestamp}-${i}`} className="align-top">
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                {formatTime(r.timestamp)}
              </td>
              <td className="px-3 py-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                    r.status === "online"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/10 text-red-600 dark:text-red-400",
                  )}
                >
                  {r.status === "online" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  {r.status === "online" ? "Online" : "Offline"}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">
                {r.responseTime ?? 0} ms
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {r.error ? (
                  <span className="inline-flex items-start gap-1 text-red-600 dark:text-red-400">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="break-words">{r.error}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground/60">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HistoryTable;