import { useMemo, useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { TaskCard } from "@/components/tasks/TaskCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/stores/useAppStore";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const Tasks = () => {
  const { tasks, categories, loading } = useTasks();
  const { groupBy, setGroupBy } = useAppStore();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [mineOnly, setMineOnly] = useState(false);

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => !t.parent_task_id)
      .filter((t) => (q ? t.title.toLowerCase().includes(q.toLowerCase()) : true))
      .filter((t) => (statusFilter === "all" ? true : t.status === statusFilter))
      .filter((t) => (priorityFilter === "all" ? true : t.priority === priorityFilter))
      .filter((t) => (categoryFilter === "all" ? true : t.category_id === categoryFilter))
      .filter((t) => (mineOnly && user ? (t.assigned_to ?? []).includes(user.id) : true));
  }, [tasks, q, statusFilter, priorityFilter, categoryFilter, mineOnly, user]);

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
        label: categories.find((c) => c.id === key)?.name ?? "Uncategorized",
        color: categories.find((c) => c.id === key)?.color,
        items,
      }));
    } else {
      const order = ["todo", "in_progress", "delayed", "done"];
      return order.map((s) => ({ key: s, label: s.replace("_", " "), color: undefined, items: filtered.filter((t) => t.status === s) }));
    }
  }, [filtered, groupBy, categories]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks…" className="pl-9 bg-card" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px] bg-card"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="delayed">Delayed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px] bg-card"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
          <SelectTrigger className="w-[140px] bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="category">Group: Category</SelectItem>
            <SelectItem value="status">Group: Status</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 px-1">
          <Switch id="mine" checked={mineOnly} onCheckedChange={setMineOnly} />
          <Label htmlFor="mine" className="text-xs">My tasks</Label>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-card" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/5 bg-card/30 p-12 text-center">
          <p className="text-sm text-muted-foreground">No tasks yet. Hit <kbd className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">New task</kbd> to start.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.filter((g) => g.items.length > 0).map((g) => (
            <section key={g.key}>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {g.color && <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />}
                {g.label} <span className="text-muted-foreground/60">({g.items.length})</span>
              </h3>
              <div className="space-y-2">
                {g.items.map((t) => (
                  <TaskCard key={t.id} task={t} category={categories.find((c) => c.id === t.category_id)} subtaskStats={subtaskStats(t.id)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tasks;
