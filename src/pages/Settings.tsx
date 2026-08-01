import { useState } from "react";
import { Bell, Globe, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const Settings = () => {
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [checkInterval, setCheckInterval] = useState("60");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Basic application preferences.
        </p>
      </div>

      <div className="divide-y rounded-xl border bg-card shadow-sm">
        {/* Check interval */}
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Globe className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-sm font-medium">Check interval</p>
              <p className="text-xs text-muted-foreground">
                How often monitors are polled (seconds).
              </p>
            </div>
          </div>
          <select
            id="check-interval"
            name="check-interval"
            value={checkInterval}
            onChange={(e) => setCheckInterval(e.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="30">30s</option>
            <option value="60">60s</option>
            <option value="120">2m</option>
            <option value="300">5m</option>
          </select>
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bell className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-sm font-medium">Notifications</p>
              <p className="text-xs text-muted-foreground">
                Alert when a monitor goes offline.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={notifications}
            aria-label="Toggle notifications"
            onClick={() => setNotifications((v) => !v)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
              notifications ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                notifications ? "translate-x-5" : "translate-x-0.5",
              )}
            />
          </button>
        </div>

        {/* Theme */}
        <div className="flex items-center justify-between p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {theme === "light" ? (
                <Sun className="h-4.5 w-4.5" />
              ) : (
                <Moon className="h-4.5 w-4.5" />
              )}
            </span>
            <div>
              <p className="text-sm font-medium">Appearance</p>
              <p className="text-xs text-muted-foreground">
                Light or dark interface theme.
              </p>
            </div>
          </div>
          <div className="inline-flex rounded-md border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium",
                theme === "light"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium",
                theme === "dark"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Dark
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-muted/40 p-5">
        <p className="text-sm text-muted-foreground">
          These settings are stored locally for now. A backend will be added in
          a later step to persist preferences.
        </p>
      </div>
    </div>
  );
};

export default Settings;