/**
 * Persisted monitoring preferences (localStorage) shared by the Settings
 * page and the automatic polling scheduler in MonitorsContext.
 *
 * - autoCheckEnabled: whether websites are checked automatically.
 * - checkIntervalSeconds: how often every monitor is polled.
 *
 * The store keeps a single cached snapshot so React's
 * useSyncExternalStore receives a referentially stable value between
 * changes.
 */

export interface MonitoringSettings {
  autoCheckEnabled: boolean;
  checkIntervalSeconds: number;
}

export const CHECK_INTERVAL_OPTIONS = [30, 60, 120, 300] as const;

export const DEFAULT_MONITORING_SETTINGS: MonitoringSettings = {
  autoCheckEnabled: true,
  checkIntervalSeconds: 60,
};

const STORAGE_KEY = "statuspulse.monitoring.settings";
const CHANGE_EVENT = "statuspulse:monitoring-settings-changed";

let current: MonitoringSettings | null = null;

const isIntervalOption = (value: unknown): value is number =>
  typeof value === "number" &&
  (CHECK_INTERVAL_OPTIONS as readonly number[]).includes(value);

function readStored(): MonitoringSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MONITORING_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<MonitoringSettings> | null;
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_MONITORING_SETTINGS };
    }
    return {
      autoCheckEnabled:
        typeof parsed.autoCheckEnabled === "boolean"
          ? parsed.autoCheckEnabled
          : DEFAULT_MONITORING_SETTINGS.autoCheckEnabled,
      checkIntervalSeconds: isIntervalOption(parsed.checkIntervalSeconds)
        ? parsed.checkIntervalSeconds
        : DEFAULT_MONITORING_SETTINGS.checkIntervalSeconds,
    };
  } catch {
    return { ...DEFAULT_MONITORING_SETTINGS };
  }
}

/** Stable snapshot for useSyncExternalStore. */
export function getMonitoringSettings(): MonitoringSettings {
  if (current === null) {
    current = readStored();
  }
  return current;
}

/** Persist a partial update and notify subscribers. */
export function updateMonitoringSettings(
  patch: Partial<MonitoringSettings>,
): MonitoringSettings {
  const base = getMonitoringSettings();
  const next: MonitoringSettings = {
    autoCheckEnabled:
      typeof patch.autoCheckEnabled === "boolean"
        ? patch.autoCheckEnabled
        : base.autoCheckEnabled,
    checkIntervalSeconds: isIntervalOption(patch.checkIntervalSeconds)
      ? patch.checkIntervalSeconds
      : base.checkIntervalSeconds,
  };
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Preferences stay in memory when storage is unavailable.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return next;
}

/** Subscribe to preference changes (same window). */
export function subscribeMonitoringSettings(
  onChange: () => void,
): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}
