import { Activity, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useMonitors } from "@/contexts/MonitorsContext";
import MonitorForm from "@/components/monitors/MonitorForm";
import MonitorCard from "@/components/monitors/MonitorCard";

const Monitors = () => {
  const {
    monitors,
    loading,
    loadError,
    checkingId,
    autoChecking,
    monitoringSettings,
    addMonitor,
    deleteMonitor,
    checkMonitor,
  } = useMonitors();

  const handleDelete = async (id: number) => {
    try {
      await deleteMonitor(id);
    } catch (err) {
      console.error("Failed to delete monitor:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Monitors</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the endpoints you want to watch.
        </p>
      </div>

      <MonitorForm onCreate={addMonitor} />

      {loadError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border bg-card px-6 py-16 text-center shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading monitors…
          </span>
        </div>
      ) : monitors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center shadow-sm">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Activity className="h-7 w-7 text-muted-foreground" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">No monitors created yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Use the form above to add your first monitor, then click Check Now
            to run a real status check.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {monitors.length}{" "}
              {monitors.length === 1 ? "monitor" : "monitors"}
            </h2>
            {monitoringSettings.autoCheckEnabled && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw
                  className={`h-3.5 w-3.5 ${autoChecking ? "animate-spin text-primary" : ""}`}
                />
                {autoChecking
                  ? "Checking all websites…"
                  : `Auto-check every ${monitoringSettings.checkIntervalSeconds}s`}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {monitors.map((monitor) => (
              <MonitorCard
                key={monitor.id}
                monitor={monitor}
                onDelete={handleDelete}
                onCheck={checkMonitor}
                isChecking={checkingId === monitor.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Monitors;