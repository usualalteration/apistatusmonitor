import { apiFetchJSON } from "@/lib/api";

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
  const raw = await apiFetchJSON(
    `/api/my/v1/check-history?monitor_id=${monitorId}&limit=${limit}`,
  );
  const data = unwrap(raw);
  if (!data || data.ok === false) {
    throw new Error(errorMessage(raw, "Failed to load history"));
  }
  const list = data.history;
  return Array.isArray(list) ? (list as HistoryRecord[]) : [];
}

export async function fetchRecentFailures(
  limit = 5,
): Promise<HistoryRecord[]> {
  const raw = await apiFetchJSON(
    `/api/my/v1/check-history?recent=failures&limit=${limit}`,
  );
  const data = unwrap(raw);
  if (!data || data.ok === false) {
    throw new Error(errorMessage(raw, "Failed to load failures"));
  }
  const list = data.failures;
  return Array.isArray(list) ? (list as HistoryRecord[]) : [];
}