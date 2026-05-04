import { useLocation } from "react-router-dom";
import { Plus, Bell, LayoutList, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/useAppStore";
import { useState } from "react";
import { TaskCreateDialog } from "@/components/tasks/TaskCreateDialog";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/tasks": "Tasks",
  "/calendar": "Calendar",
  "/notifications": "Notifications",
  "/settings": "Settings",
};

export const Header = () => {
  const { pathname } = useLocation();
  const { view, setView } = useAppStore();
  const [open, setOpen] = useState(false);
  const title = titles[pathname] ?? "Track'm";

  return (
    <header className="flex h-14 items-center justify-between border-b border-white/5 px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {pathname === "/tasks" && (
          <div className="hidden sm:flex items-center rounded-lg border border-white/5 bg-card p-0.5">
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ${view === "list" ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
            >
              <LayoutList className="h-3.5 w-3.5" /> List
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ${view === "calendar" ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </button>
          </div>
        )}
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <Button onClick={() => setOpen(true)} className="h-9 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground glow-primary">
          <Plus className="h-4 w-4" /> New task
        </Button>
      </div>
      <TaskCreateDialog open={open} onOpenChange={setOpen} />
    </header>
  );
};
