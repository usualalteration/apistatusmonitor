import { cn } from "@/lib/utils";
import type { HistoryRecord } from "@/lib/history";

interface ResponseTimeChartProps {
  records: HistoryRecord[];
}

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleTimeString();
};

const ResponseTimeChart = ({ records }: ResponseTimeChartProps) => {
  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No response time data yet. Run a check to start collecting metrics.
      </p>
    );
  }

  // Display oldest -> newest (left to right).
  const series = [...records].reverse();
  const max = Math.max(1, ...series.map((r) => r.responseTime || 0));

  return (
    <div>
      <div className="flex h-40 items-end gap-1 overflow-x-auto rounded-md bg-muted/30 p-2">
        {series.map((r, i) => {
          const heightPct = Math.max(
            4,
            Math.round(((r.responseTime || 0) / max) * 100),
          );
          return (
            <div
              key={`${r.timestamp}-${i}`}
              className="flex h-full min-w-[6px] flex-1 flex-col justify-end"
              title={`${formatTime(r.timestamp)} · ${r.responseTime ?? 0} ms · ${r.status}`}
            >
              <div
                className={cn(
                  "w-full rounded-t",
                  r.status === "online" ? "bg-emerald-500/70" : "bg-red-500/70",
                )}
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{formatTime(series[0].timestamp)}</span>
        <span>{formatTime(series[series.length - 1].timestamp)}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Bars are colored by status (green = online, red = offline). Hover a bar
        for details.
      </p>
    </div>
  );
};

export default ResponseTimeChart;