import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, ListChecks, Calendar, Bell, Settings, LogOut, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/useAppStore";
import { useTasks } from "@/hooks/useTasks";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: ListChecks, badgeKey: "overdue" as const },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
];

export const Sidebar = () => {
  const { user, signOut } = useAuth();
  const { currentWorkspace } = useAppStore();
  const { tasks } = useTasks();
  const overdue = tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length;
  const { pathname } = useLocation();

  return (
    <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r border-white/5 bg-sidebar">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
          <CheckCircle2 className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">Track'm</div>
          {currentWorkspace && (
            <div className="text-[11px] text-muted-foreground truncate max-w-[160px]">{currentWorkspace.name}</div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {items.map(({ to, label, icon: Icon, badgeKey }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          const showBadge = badgeKey === "overdue" && overdue > 0;
          return (
            <NavLink
              key={to}
              to={to}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {showBadge && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                  {overdue}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-3">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-secondary text-xs">
              {(user?.email ?? "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{user?.user_metadata?.full_name ?? user?.email}</div>
            <div className="text-[10px] text-muted-foreground truncate">{user?.email}</div>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={signOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
};
