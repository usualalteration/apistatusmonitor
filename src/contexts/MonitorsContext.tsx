import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Monitor, MonitorStatus } from "@/types/monitor";
import {
  getMonitoringSettings,
  subscribeMonitoringSettings,
  type MonitoringSettings,
} from "@/lib/monitoringSettings";
import {
  apiFetchJSON,
  ApiPendingError,
  JSON_HEADERS,
  sleep,
} from "@/lib/api";

interface CheckResult {
  ok: boolean;
  id: number | null;
  status: MonitorStatus;
  responseTime: number;
  timestamp: string;
}

interface MonitorsContextValue {
  monitors: Monitor[];
  loading: boolean;
  loadError: string | null;
  checkingId: number | null;
  autoChecking: boolean;
  lastAutoCheckAt: string | null;
  monitoringSettings: MonitoringSettings;
  addMonitor: (input: { name: string; url: string }) => Promise<void>;
  deleteMonitor: (id: number) => Promise<void>;
  checkMonitor: (id: number) => Promise<void>;
  refreshMonitors: () => Promise<void>;
}

const MonitorsContext = createContext<MonitorsContextValue | undefined>(
  undefined,
);

const unwrap = (raw: unknown): Record<string, unknown> | null => {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if ("body" in obj && obj.body && typeof obj.body === "object") {
    return obj.body as Record<string, unknown>;
  }
  return obj;
};

const errorMessage = (raw: unknown, fallback: string): string => {
  const obj = unwrap(raw);
  if (obj && typeof obj.error === "string" && obj.error) return obj.error;
  return fallback;
};

const normalizeMonitor = (obj: Record<string, unknown>): Monitor | null => {
  if (typeof obj.id !== "number") return null;
  const status = obj.status;
  if (status !== "unknown" && status !== "online" && status !== "offline") {
    return null;
  }
  const responseTime =
    typeof obj.responseTime === "number" ? obj.responseTime : null;
  const lastCheck =
    typeof obj.lastCheck === "string" ? obj.lastCheck : null;
  return {
    id: obj.id,
    name: String(obj.name ?? ""),
    url: String(obj.url ?? ""),
    status,
    responseTime,
    lastCheck,
  };
};

const normalizeResult = (raw: unknown): CheckResult | null => {
  const obj = unwrap(raw);
  if (!obj) return null;
  const status = obj.status;
  if (status !== "online" && status !== "offline") return null;
  const responseTime = Number(obj.responseTime);
  const id = typeof obj.id === "number" ? obj.id : null;
  const timestamp = typeof obj.timestamp === "string" ? obj.timestamp : "";
  return {
    ok: obj.ok !== false,
    id,
    status,
    responseTime: Number.isFinite(responseTime) ? responseTime : 0,
    timestamp,
  };
};

/** Call the backend check action for one monitor and normalize the reply. */
const runCheckRequest = async (
  id: number,
): Promise<CheckResult | null> => {
  const raw = await apiFetchJSON("/api/my/v1/check", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ id }),
  });
  const result = normalizeResult(raw);
  if (!result) {
    throw new Error(errorMessage(raw, "Check failed"));
  }
  return result;
};

export const MonitorsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [autoChecking, setAutoChecking] = useState(false);
  const [lastAutoCheckAt, setLastAutoCheckAt] = useState<string | null>(null);

  const monitoringSettings = useSyncExternalStore(
    subscribeMonitoringSettings,
    getMonitoringSettings,
  );

  // Refs keep the polling loop decoupled from re-renders.
  const monitorsRef = useRef<Monitor[]>([]);
  const checkingIdRef = useRef<number | null>(null);
  const autoRunInFlightRef = useRef(false);

  useEffect(() => {
    monitorsRef.current = monitors;
  }, [monitors]);

  useEffect(() => {
    checkingIdRef.current = checkingId;
  }, [checkingId]);

  const applyResult = useCallback(
    (requestedId: number, result: CheckResult) => {
      const id = result.id ?? requestedId;
      setMonitors((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                status: result.status,
                responseTime: result.responseTime,
                lastCheck: result.timestamp || m.lastCheck,
              }
            : m,
        ),
      );
    },
    [],
  );

  const loadMonitors = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const raw = await apiFetchJSON("/api/my/v1/monitors", { method: "GET" });
      const obj = unwrap(raw);
      if (!obj || obj.ok === false) {
        throw new Error(errorMessage(raw, "Failed to load monitors"));
      }
      const list = Array.isArray(obj.monitors) ? obj.monitors : [];
      const normalized = list
        .map((m) => normalizeMonitor(m as Record<string, unknown>))
        .filter((m): m is Monitor => m !== null);
      setMonitors(normalized);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load monitors.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonitors();
  }, [loadMonitors]);

  const addMonitor = useCallback(
    async ({ name, url }: { name: string; url: string }) => {
      const trimmedName = name.trim();
      const trimmedUrl = url.trim();
      let raw: unknown;
      try {
        raw = await apiFetchJSON("/api/my/v1/monitors", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ name: trimmedName, url: trimmedUrl }),
          // No retries: a repeated insert could duplicate the monitor.
          retries: 0,
        });
      } catch (e) {
        if (e instanceof ApiPendingError) {
          // The insert may still complete in the background on a cold
          // backend; give it a moment, then reconcile from the server.
          await sleep(12000);
          await loadMonitors();
          const landed = monitorsRef.current.some(
            (m) => m.name === trimmedName && m.url === trimmedUrl,
          );
          if (landed) return;
        }
        throw e;
      }
      const obj = unwrap(raw);
      if (!obj || obj.ok === false || !obj.monitor) {
        throw new Error(errorMessage(raw, "Failed to create monitor"));
      }
      const monitor = normalizeMonitor(obj.monitor as Record<string, unknown>);
      if (!monitor) {
        throw new Error("Invalid monitor returned from server.");
      }
      setMonitors((prev) => [monitor, ...prev]);
    },
    [loadMonitors],
  );

  const deleteMonitor = useCallback(async (id: number) => {
    let raw: unknown;
    try {
      raw = await apiFetchJSON(`/api/my/v1/monitors/${id}`, {
        method: "DELETE",
        // No retries: a second delete of the same id would report
        // "Monitor not found" even though the first one succeeded.
        retries: 0,
      });
    } catch (e) {
      if (e instanceof ApiPendingError) {
        // The delete may still complete in the background on a cold
        // backend; give it a moment, then reconcile from the server.
        await sleep(12000);
        await loadMonitors();
        const stillThere = monitorsRef.current.some((m) => m.id === id);
        if (!stillThere) return;
      }
      throw e;
    }
    const obj = unwrap(raw);
    if (!obj || obj.ok === false) {
      throw new Error(errorMessage(raw, "Failed to delete monitor"));
    }
    setMonitors((prev) => prev.filter((m) => m.id !== id));
  }, [loadMonitors]);

  const checkMonitor = useCallback(async (id: number) => {
    setCheckingId(id);
    try {
      const result = await runCheckRequest(id);
      if (result) {
        applyResult(id, result);
      }
    } finally {
      setCheckingId((current) => (current === id ? null : current));
    }
  }, [applyResult]);

  /**
   * One automatic monitoring round: check every known monitor in order,
   * updating each card as its result arrives. Skips the round while a
   * manual check is in progress and never overlaps with another round.
   */
  const runAutoChecks = useCallback(async () => {
    if (autoRunInFlightRef.current) return;
    if (checkingIdRef.current !== null) return;
    const snapshot = monitorsRef.current;
    if (snapshot.length === 0) return;

    autoRunInFlightRef.current = true;
    setAutoChecking(true);
    try {
      for (const monitor of snapshot) {
        // Stop the round if the user started a manual check meanwhile.
        if (checkingIdRef.current !== null) break;
        // Skip monitors deleted since the round started.
        if (!monitorsRef.current.some((m) => m.id === monitor.id)) continue;
        try {
          const result = await runCheckRequest(monitor.id);
          if (result) {
            applyResult(monitor.id, result);
          }
        } catch (e) {
          // Keep the last known status; the next round retries.
          console.warn(`Automatic check failed for monitor ${monitor.id}:`, e);
        }
      }
      setLastAutoCheckAt(new Date().toISOString());
    } finally {
      autoRunInFlightRef.current = false;
      setAutoChecking(false);
    }
  }, [applyResult]);

  // Automatic monitoring: poll every configured interval while the app
  // is open so production dashboards keep recording real checks.
  const autoEnabled = monitoringSettings.autoCheckEnabled;
  const intervalSeconds = monitoringSettings.checkIntervalSeconds;
  useEffect(() => {
    if (!autoEnabled) return;
    const intervalMs = Math.max(15, intervalSeconds) * 1000;
    const timer = window.setInterval(() => {
      void runAutoChecks();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [autoEnabled, intervalSeconds, runAutoChecks]);

  const value = useMemo(
    () => ({
      monitors,
      loading,
      loadError,
      checkingId,
      autoChecking,
      lastAutoCheckAt,
      monitoringSettings,
      addMonitor,
      deleteMonitor,
      checkMonitor,
      refreshMonitors: loadMonitors,
    }),
    [
      monitors,
      loading,
      loadError,
      checkingId,
      autoChecking,
      lastAutoCheckAt,
      monitoringSettings,
      addMonitor,
      deleteMonitor,
      checkMonitor,
      loadMonitors,
    ],
  );

  return (
    <MonitorsContext.Provider value={value}>
      {children}
    </MonitorsContext.Provider>
  );
};

export const useMonitors = (): MonitorsContextValue => {
  const ctx = useContext(MonitorsContext);
  if (!ctx) {
    throw new Error("useMonitors must be used within a MonitorsProvider");
  }
  return ctx;
};
