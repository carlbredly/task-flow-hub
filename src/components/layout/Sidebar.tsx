import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, ListChecks, Calendar, Bell, Settings, LogOut, CheckCircle2, HelpCircle, Moon, Sun, ChevronLeft, ChevronRight, Timer as TimerIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/useAppStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useTasks } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";

const COLLAPSED_KEY = "trackm-sidebar-collapsed";

const menuItems = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/tasks", label: "Tâches", icon: ListChecks, badgeKey: "overdue" as const },
  { to: "/focus", label: "Mode Focus", icon: TimerIcon },
  { to: "/calendar", label: "Calendrier", icon: Calendar },
  { to: "/notifications", label: "Notifications", icon: Bell },
];
const generalItems = [{ to: "/settings", label: "Paramètres", icon: Settings }];

export const Sidebar = () => {
  const { user, signOut } = useAuth();
  const { currentWorkspace } = useAppStore();
  const { tasks } = useTasks();
  const { theme, toggle: toggleTheme } = useThemeStore();
  const overdue = tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length;
  const { pathname } = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === "true"; } catch { return false; }
  });

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSED_KEY, String(next)); } catch {}
  };

  const NavItem = ({ to, label, icon: Icon, badge }: { to: string; label: string; icon: typeof LayoutDashboard; badge?: React.ReactNode }) => {
    const active = pathname === to || (to !== "/" && pathname.startsWith(to));
    return (
      <NavLink
        to={to}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-muted/80 hover:text-foreground",
          collapsed && "justify-center px-2",
        )}
        title={collapsed ? label : undefined}
      >
        {active && !collapsed && (
          <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-primary" aria-hidden />
        )}
        <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")} />
        {!collapsed && <span className="flex-1 truncate">{label}</span>}
        {badge}
      </NavLink>
    );
  };

  return (
    <aside
      className={cn(
        "relative hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-4 transition-all duration-300 md:flex md:rounded-l-3xl",
        collapsed ? "w-[68px]" : "w-[260px]",
      )}
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={toggle}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-muted"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-5", collapsed && "justify-center px-0")}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-md" style={{ background: "var(--gradient-primary)" }}>
          <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight text-foreground">Track'm</div>
            {currentWorkspace && (
              <div className="truncate text-xs text-muted-foreground">{currentWorkspace.name}</div>
            )}
          </div>
        )}
      </div>

      {!collapsed && (
        <p className="mb-2 mt-6 px-5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Menu</p>
      )}
      <nav className={cn("flex-1 space-y-1 px-3", collapsed && "mt-4 px-2")}>
        {menuItems.map(({ to, label, icon: Icon, badgeKey }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          const showBadge = badgeKey === "overdue" && overdue > 0 && !collapsed;
          return (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all duration-200",
                collapsed ? "justify-center px-2" : "px-3",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-primary" aria-hidden />
              )}
              <div className="relative">
                <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")} />
                {collapsed && overdue > 0 && badgeKey === "overdue" && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-destructive px-0.5 text-[8px] font-bold text-destructive-foreground">
                    {overdue > 9 ? "9+" : overdue}
                  </span>
                )}
              </div>
              {!collapsed && <span className="flex-1">{label}</span>}
              {showBadge && (
                <span className="flex h-5 min-w-[22px] items-center justify-center rounded-full bg-destructive/15 px-1.5 text-[10px] font-bold text-destructive">
                  {overdue > 99 ? "99+" : overdue}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {!collapsed && (
        <p className="mb-2 mt-4 px-5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Général</p>
      )}
      <nav className={cn("space-y-1 px-3", collapsed && "px-2")}>
        {generalItems.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all duration-200",
                collapsed ? "justify-center px-2" : "px-3",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-primary" aria-hidden />
              )}
              <Icon className={cn("h-[18px] w-[18px]", active && "text-primary")} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          );
        })}
        <NavLink
          to="/help"
          title={collapsed ? "Aide" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground",
            collapsed ? "justify-center px-2" : "px-3",
          )}
        >
          <HelpCircle className="h-[18px] w-[18px]" />
          {!collapsed && "Aide"}
        </NavLink>
        <button
          type="button"
          onClick={toggleTheme}
          title={collapsed ? (theme === "dark" ? "Mode clair" : "Mode sombre") : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground",
            collapsed ? "justify-center px-2" : "px-3",
          )}
        >
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          {!collapsed && (theme === "dark" ? "Mode clair" : "Mode sombre")}
        </button>
      </nav>

      {!collapsed && (
        <div className="mx-3 mt-4 overflow-hidden rounded-2xl bg-primary p-4 text-primary-foreground shadow-lg">
          <p className="text-sm font-semibold leading-snug">Restez productif partout</p>
          <p className="mt-1 text-xs text-primary-foreground/85">Synchronisez vos tâches et ne manquez aucune échéance.</p>
          <Button size="sm" variant="secondary" className="mt-3 h-9 w-full rounded-xl bg-white/15 text-xs font-semibold text-white hover:bg-white/25" type="button">
            En savoir plus
          </Button>
        </div>
      )}

      <div className={cn("mt-auto border-t border-sidebar-border p-3", collapsed && "px-2")}>
        <div className={cn("flex items-center rounded-xl border border-border bg-card shadow-sm", collapsed ? "justify-center p-2" : "gap-3 p-2")}>
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
              {(user?.email ?? "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{user?.user_metadata?.full_name ?? user?.email}</div>
                <div className="truncate text-[10px] text-muted-foreground">{user?.email}</div>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 rounded-lg" onClick={signOut} aria-label="Déconnexion">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
