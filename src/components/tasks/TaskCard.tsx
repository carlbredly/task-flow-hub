import { Task, Category } from "@/hooks/useTasks";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarClock, MapPin, ListTree } from "lucide-react";
import { format, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/stores/useAppStore";

const priorityDot: Record<string, string> = {
  low: "bg-muted-foreground",
  medium: "bg-primary",
  high: "bg-warning",
  urgent: "bg-destructive animate-pulse-glow",
};

interface Props {
  task: Task;
  category?: Category;
  subtaskStats?: { done: number; total: number };
}

export const TaskCard = ({ task, category, subtaskStats }: Props) => {
  const { openTaskPanel } = useAppStore();
  const overdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== "done";

  const toggleDone = async (checked: boolean) => {
    await supabase.from("tasks").update({ status: checked ? "done" : "todo" }).eq("id", task.id);
  };

  return (
    <button
      onClick={() => openTaskPanel(task.id)}
      className="group flex w-full items-center gap-3 rounded-xl border border-white/5 bg-card px-4 py-3 text-left transition-all hover:border-white/10 hover:bg-card/80 surface-card"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${priorityDot[task.priority]}`} aria-label={`Priority ${task.priority}`} />
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={task.status === "done"} onCheckedChange={(c) => toggleDone(!!c)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {task.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {category && (
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: category.color }} />
              {category.name}
            </span>
          )}
          {task.due_date && (
            <span className={`inline-flex items-center gap-1 ${overdue ? "text-destructive" : ""}`}>
              <CalendarClock className="h-3 w-3" />
              {format(new Date(task.due_date), "MMM d, HH:mm")}
            </span>
          )}
          {task.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {task.location}
            </span>
          )}
          {subtaskStats && subtaskStats.total > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListTree className="h-3 w-3" /> {subtaskStats.done}/{subtaskStats.total}
            </span>
          )}
        </div>
      </div>
      <div className="flex -space-x-2">
        {(task.assigned_to ?? []).slice(0, 3).map((uid) => (
          <Avatar key={uid} className="h-6 w-6 border border-card">
            <AvatarFallback className="bg-secondary text-[10px]">{uid.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        ))}
      </div>
    </button>
  );
};
