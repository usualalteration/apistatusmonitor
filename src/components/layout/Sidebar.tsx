import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  Settings,
  HeartPulse,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/monitors", label: "Monitors", icon: Activity },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const Sidebar = ({ open, onClose }: SidebarProps) => {
  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-black/50 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-in-out lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between border-b px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HeartPulse className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-sidebar-primary">
                StatusPulse
              </p>
              <p className="text-xs text-muted-foreground">API Monitor</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span>{label}</span>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t px-5 py-4">
          <p className="text-xs text-muted-foreground">
            v0.1.0 &middot; No backend connected
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;