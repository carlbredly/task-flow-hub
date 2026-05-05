import { useMemo, useState } from "react";
import SEO from "@/components/seo/SEO";
import { useTasks } from "@/hooks/useTasks";
import { Search, LayoutList, Columns3, CalendarDays, GanttChart, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/stores/useAppStore";
import { useAuth } from "@/contexts/AuthContext";
import { Label } from "@/components/ui/label";
import CalendarPage from "./Calendar";
import { TaskColumnsDnD } from "@/components/tasks/TaskColumnsDnD";
import GanttView from "@/components/tasks/GanttView";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import type { Task } from "@/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TaskCreateDialog } from "@/components/tasks/TaskCreateDialog";
import { cn } from "@/lib/utils";

const sortTasksByOrder = (arr: Task[]) =>
  [...arr].sort((a, b) => {
    const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (so !== 0) return so;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

const STATUS_LABEL: Record<string, string> = {
  todo: "À faire",
  in_progress: "En cours",
  delayed: "En retard",
  done: "Terminé",
};

const Tasks = () => {
  const { tasks, categories, loading, refetch } = useTasks();
  const { groupBy, setGroupBy, view, setView, tasksSearch, setTasksSearch } = useAppStore();
  const { user } = useAuth();
  const { members, loading: membersLoading } = useWorkspaceMembers();
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => !t.parent_task_id)
      .filter((t) => (tasksSearch ? t.title.toLowerCase().includes(tasksSearch.toLowerCase()) : true))
      .filter((t) => (statusFilter === "all" ? true : t.status === statusFilter))
      .filter((t) => (priorityFilter === "all" ? true : t.priority === priorityFilter))
      .filter((t) => (categoryFilter === "all" ? true : t.category_id === categoryFilter))
      .filter((t) => {
        if (assigneeFilter === "all") return true;
        if (assigneeFilter === "unassigned") return (t.assigned_to?.length ?? 0) === 0;
        return (t.assigned_to ?? []).includes(assigneeFilter);
      });
  }, [tasks, tasksSearch, statusFilter, priorityFilter, categoryFilter, assigneeFilter]);

  const subtaskStats = (parentId: string) => {
    const subs = tasks.filter((t) => t.parent_task_id === parentId);
    return { done: subs.filter((s) => s.status === "done").length, total: subs.length };
  };

  const groups = useMemo(() => {
    if (groupBy === "category") {
      const map = new Map<string, typeof filtered>();
      filtered.forEach((t) => {
        const key = t.category_id ?? "uncategorized";
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      });
      return Array.from(map.entries()).map(([key, items]) => ({
        key,
        label: categories.find((c) => c.id === key)?.name ?? "Sans catégorie",
        color: categories.find((c) => c.id === key)?.color,
        items: sortTasksByOrder(items),
      }));
    }
    const order = ["todo", "in_progress", "delayed", "done"] as const;
    return order.map((s) => ({
      key: s,
      label: STATUS_LABEL[s] ?? s,
      color: undefined,
      items: sortTasksByOrder(filtered.filter((t) => t.status === s)),
    }));
  }, [filtered, groupBy, categories]);

  const layoutMode = view === "kanban" ? "kanban" : "list";
  const displayMembers = members.slice(0, 5);
  const extraMembers = Math.max(0, members.length - 5);

  return (
    <>
      <SEO title="Tâches" description="Gérez vos tâches en vue liste, Kanban, calendrier ou Gantt. Filtrez par catégorie, statut, priorité et assignation." url="https://taskflowhub.app/tasks" />
      <div className="mx-auto max-w-[1600px] space-y-5 p-4 pb-24 animate-fade-in sm:p-6 sm:pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              view === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/80",
            )}
          >
            <LayoutList className="h-4 w-4" />
            Liste
          </button>
          <button
            type="button"
            onClick={() => { setView("kanban"); setGroupBy("status"); }}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              view === "kanban" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/80",
            )}
          >
            <Columns3 className="h-4 w-4" />
            Kanban
          </button>
          <button
            type="button"
            onClick={() => setView("calendar")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              view === "calendar" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/80",
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Calendrier
          </button>
          <button
            type="button"
            onClick={() => setView("gantt")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              view === "gantt" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/80",
            )}
          >
            <GanttChart className="h-4 w-4" />
            Gantt
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex -space-x-2">
            {displayMembers.map((m) => (
              <Avatar key={m.user_id} className="h-9 w-9 border-2 border-card shadow-sm">
                <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
                  {(m.profile?.display_name ?? m.profile?.email ?? m.user_id).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {extraMembers > 0 && (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-bold text-muted-foreground">
                +{extraMembers}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full border-dashed"
              aria-label="Inviter un membre"
              onClick={() => (window.location.href = "/settings")}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="rounded-xl shadow-sm">
            <Plus className="h-4 w-4" /> Créer une tâche
          </Button>
        </div>
      </div>

      <div className="relative lg:hidden">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={tasksSearch}
          onChange={(e) => setTasksSearch(e.target.value)}
          placeholder="Rechercher…"
          className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm shadow-sm"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full rounded-xl border-border bg-card shadow-sm sm:w-[160px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full rounded-xl border-border bg-card shadow-sm sm:w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="todo">À faire</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="done">Terminé</SelectItem>
            <SelectItem value="delayed">En retard</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full rounded-xl border-border bg-card shadow-sm sm:w-[150px]">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="low">Basse</SelectItem>
            <SelectItem value="medium">Moyenne</SelectItem>
            <SelectItem value="high">Haute</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter} disabled={membersLoading}>
          <SelectTrigger className="w-full rounded-xl border-border bg-card shadow-sm sm:w-[200px]">
            <SelectValue placeholder={membersLoading ? "Chargement…" : "Assignation"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="unassigned">Non assigné</SelectItem>
            {user && <SelectItem value={user.id}>Moi</SelectItem>}
            {members
              .filter((m) => m.user_id !== user?.id)
              .map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {m.profile?.display_name ?? m.profile?.email ?? `${m.user_id.slice(0, 8)}…`}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as "category" | "status")}>
          <SelectTrigger className="w-full rounded-xl border-border bg-card shadow-sm sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="category">Grouper : catégorie</SelectItem>
            <SelectItem value="status">Grouper : statut</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-[11px] text-muted-foreground">
        <Label className="sr-only">Glisser-déposer</Label>
        Glissez les cartes pour réorganiser ou changer de colonne (selon le groupement).
      </p>

      {view === "calendar" ? (
        <CalendarPage />
      ) : view === "gantt" ? (
        <GanttView />
      ) : loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/80" />
          ))}
        </div>
      ) : filtered.length === 0 && groupBy !== "status" ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune tâche ne correspond aux filtres. Utilisez « Créer une tâche » ou élargissez les filtres.
          </p>
        </div>
      ) : (
        <TaskColumnsDnD
          groups={groups}
          groupBy={groupBy}
          categories={categories}
          tasks={tasks}
          refetch={refetch}
          subtaskStats={subtaskStats}
          layout={layoutMode}
        />
      )}
      <TaskCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
    </>
  );
};

export default Tasks;
