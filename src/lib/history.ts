export interface HistoryRecord {
  monitorId: number;
  timestamp: string;
  status: "online" | "offline";
  responseTime: number;
  error: string | null;
  url: string | null;
}

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

export async function fetchMonitorHistory(
  monitorId: number,
  limit = 50,
): Promise<HistoryRecord[]> {
  const res = await fetch(
    `/api/my/v1/history?monitor_id=${monitorId}&limit=${limit}`,
  );
  const raw = await res.json();
  const data = unwrap(raw);
  if (!data || data.ok === false) {
    throw new Error(errorMessage(raw, `Failed to load history: ${res.status}`));
  }
  const list = data.history;
  return Array.isArray(list) ? (list as HistoryRecord[]) : [];
}

export async function fetchRecentFailures(
  limit = 5,
): Promise<HistoryRecord[]> {
  const res = await fetch(`/api/my/v1/history?recent=failures&limit=${limit}`);
  const raw = await res.json();
  const data = unwrap(raw);
  if (!data || data.ok === false) {
    throw new Error(
      errorMessage(raw, `Failed to load recent failures: ${res.status}`),
    );
  }
  const list = data.failures;
  return Array.isArray(list) ? (list as HistoryRecord[]) : [];
}