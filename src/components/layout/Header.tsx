import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/useAppStore";
import { useEffect, useState } from "react";
import { TaskCreateDialog } from "@/components/tasks/TaskCreateDialog";
import { useNotifications } from "@/hooks/useNotifications";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const titles: Record<string, { title: string; subtitle?: string }> = {
  "/": { title: "Tableau de bord", subtitle: "Vue d’ensemble de vos tâches et de l’activité." },
  "/tasks": { title: "Tâches", subtitle: "Organisez et suivez votre travail." },
  "/calendar": { title: "Calendrier", subtitle: "Échéances et planning." },
  "/notifications": { title: "Notifications", subtitle: "Alertes et rappels." },
  "/settings": { title: "Paramètres", subtitle: "Espace de travail et préférences." },
};

export const Header = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { tasksSearch, setTasksSearch } = useAppStore();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const meta = titles[pathname] ?? { title: "Track’m" };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const searchField = (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={tasksSearch}
        onChange={(e) => setTasksSearch(e.target.value)}
        placeholder="Rechercher une tâche…"
        className="h-10 rounded-xl border-border bg-card pl-9 pr-16 shadow-sm"
        onFocus={() => {
          if (pathname !== "/tasks") navigate("/tasks");
        }}
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
        ⌘K
      </kbd>
    </div>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 px-4 py-3 backdrop-blur-md md:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">{meta.title}</h1>
          {meta.subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{meta.subtitle}</p>}
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:max-w-xl lg:flex-1">
          {searchField}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-xl"
            aria-label="Notifications"
            onClick={() => navigate("/notifications")}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" aria-hidden />
            )}
          </Button>
          <div className="hidden items-center gap-2 rounded-xl border border-border bg-card px-2 py-1 pr-3 shadow-sm sm:flex">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                {(user?.email ?? "U").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="max-w-[140px] truncate text-left text-xs">
              <div className="font-medium text-foreground">{user?.user_metadata?.full_name ?? "Compte"}</div>
              <div className="truncate text-[10px] text-muted-foreground">{user?.email}</div>
            </div>
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="h-10 gap-1.5 rounded-xl bg-primary px-4 font-medium text-primary-foreground shadow-md hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Nouvelle tâche
          </Button>
        </div>
      </div>
      <TaskCreateDialog open={open} onOpenChange={setOpen} />
    </header>
  );
};
