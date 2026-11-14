import { Activity, CheckCircle2, XCircle, TrendingUp, RefreshCw } from "lucide-react";
import { useMonitors } from "@/contexts/MonitorsContext";
import RecentFailures from "@/components/dashboard/RecentFailures";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: "neutral" | "online" | "offline";
  hint: string;
}

const toneStyles: Record<StatCardProps["tone"], string> = {
  neutral: "text-primary bg-primary/10",
  online: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
  offline: "text-red-600 bg-red-500/10 dark:text-red-400",
};

const StatCard = ({ label, value, icon: Icon, tone, hint }: StatCardProps) => (
  <div className="rounded-xl border bg-card p-5 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
          {value}
        </p>
      </div>
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-lg ${toneStyles[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </span>
    </div>
    <p className="mt-3 text-xs text-muted-foreground">{hint}</p>
  </div>
);

const formatTime = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleTimeString();
};

const Dashboard = () => {
  const {
    monitors,
    autoChecking,
    lastAutoCheckAt,
    monitoringSettings,
  } = useMonitors();

  const total = monitors.length;
  const online = monitors.filter((m) => m.status === "online").length;
  const offline = monitors.filter((m) => m.status === "offline").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your monitored endpoints.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total monitors"
          value={total}
          icon={Activity}
          tone="neutral"
          hint="Endpoints being tracked"
        />
        <StatCard
          label="Online"
          value={online}
          icon={CheckCircle2}
          tone="online"
          hint="Currently responding"
        />
        <StatCard
          label="Offline"
          value={offline}
          icon={XCircle}
          tone="offline"
          hint="Failing or unreachable"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-base font-semibold">Uptime summary</h2>
          </div>
          {total === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No monitors yet. Create one from the Monitors page to start
              tracking its status.
            </p>
          ) : monitoringSettings.autoCheckEnabled ? (
            <div className="mt-3 space-y-2">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw
                  className={`h-4 w-4 ${autoChecking ? "animate-spin text-primary" : "text-muted-foreground"}`}
                />
                {autoChecking
                  ? `Checking every website now — automatic round in progress.`
                  : `Websites are checked automatically every ${monitoringSettings.checkIntervalSeconds}s while the app is open.`}
              </p>
              <p className="text-xs text-muted-foreground">
                Last automatic round: {formatTime(lastAutoCheckAt)}. Results
                are cached in Redis, persisted to PostgreSQL, and logged to
                MongoDB history.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Automatic checks are turned off in Settings. Run a check from a
              monitor card to record a real status. Latest results are cached
              in Redis, persisted to PostgreSQL, and logged to MongoDB history.
            </p>
          )}
        </div>
        <RecentFailures />
      </div>
    </div>
  );
};

export default Dashboard;