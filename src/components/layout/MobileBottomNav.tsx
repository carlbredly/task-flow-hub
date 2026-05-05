import { NavLink } from "react-router-dom";
import { Bell, Calendar, LayoutDashboard, ListChecks, Settings, Timer as TimerIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useNotifications, requestNotificationPermission } from "@/hooks/useNotifications";

const items = [
  { to: "/", label: "Accueil", icon: LayoutDashboard },
  { to: "/tasks", label: "Tâches", icon: ListChecks },
  { to: "/focus", label: "Focus", icon: TimerIcon },
  { to: "/calendar", label: "Agenda", icon: Calendar },
  { to: "/notifications", label: "Alertes", icon: Bell },
  { to: "/settings", label: "Réglages", icon: Settings },
];

export const MobileBottomNav = () => {
  const { unreadCount } = useNotifications();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 px-2 py-1 backdrop-blur md:hidden">
      <ul className="grid grid-cols-6 gap-1">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              onClick={to === "/notifications" ? () => requestNotificationPermission() : undefined}
              className={({ isActive }) =>
                `relative flex h-14 flex-col items-center justify-center rounded-lg text-[10px] ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="mobile-nav-active"
                      className="absolute inset-0 rounded-lg bg-primary/15"
                      transition={{ type: "spring", stiffness: 420, damping: 35 }}
                    />
                  )}
                  <span className="relative">
                    <Icon className="h-4 w-4" />
                    {to === "/notifications" && unreadCount > 0 && (
                      <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[8px] font-bold text-destructive-foreground">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </span>
                  <span className="relative mt-1">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};
