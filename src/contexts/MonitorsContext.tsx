import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Monitor, MonitorStatus } from "@/types/monitor";

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
  addMonitor: (input: { name: string; url: string }) => Promise<void>;
  deleteMonitor: (id: number) => Promise<void>;
  checkMonitor: (id: number) => Promise<void>;
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

export const MonitorsProvider = ({ children }: { children: ReactNode }) => {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<number | null>(null);

  const loadMonitors = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/my/v1/monitors", { method: "GET" });
      const raw = await response.json();
      const obj = unwrap(raw);
      if (!obj || obj.ok === false) {
        throw new Error(errorMessage(raw, `Failed to load monitors: ${response.status}`));
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
      const response = await fetch("/api/my/v1/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), url: url.trim() }),
      });
      const raw = await response.json();
      const obj = unwrap(raw);
      if (!obj || obj.ok === false || !obj.monitor) {
        throw new Error(errorMessage(raw, `Failed to create monitor: ${response.status}`));
      }
      const monitor = normalizeMonitor(obj.monitor as Record<string, unknown>);
      if (!monitor) {
        throw new Error("Invalid monitor returned from server.");
      }
      setMonitors((prev) => [monitor, ...prev]);
    },
    [],
  );

  const deleteMonitor = useCallback(async (id: number) => {
    const response = await fetch(`/api/my/v1/monitors/${id}`, {
      method: "DELETE",
    });
    const raw = await response.json();
    const obj = unwrap(raw);
    if (!obj || obj.ok === false) {
      throw new Error(errorMessage(raw, `Failed to delete monitor: ${response.status}`));
    }
    setMonitors((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const checkMonitor = useCallback(async (id: number) => {
    setCheckingId(id);
    try {
      const response = await fetch("/api/my/v1/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const raw = await response.json();
      const result = normalizeResult(raw);
      if (!result) {
        throw new Error(errorMessage(raw, `Check failed: ${response.status}`));
      }
      setMonitors((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                status: result.status,
                responseTime: result.responseTime,
                lastCheck: result.timestamp,
              }
            : m,
        ),
      );
    } finally {
      setCheckingId((current) => (current === id ? null : current));
    }
  }, []);

  const value = useMemo(
    () => ({
      monitors,
      loading,
      loadError,
      checkingId,
      addMonitor,
      deleteMonitor,
      checkMonitor,
    }),
    [monitors, loading, loadError, checkingId, addMonitor, deleteMonitor, checkMonitor],
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