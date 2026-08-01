export type MonitorStatus = "unknown" | "online" | "offline";

export interface Monitor {
  id: number;
  name: string;
  url: string;
  status: MonitorStatus;
  responseTime: number | null; // milliseconds; null until checked
  lastCheck: string | null; // ISO timestamp; null until checked
}