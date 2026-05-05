import type { ReactNode } from "react";
import { Task, Category } from "@/hooks/useTasks";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarClock, MapPin, ListTree } from "lucide-react";
import { format, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";

const priorityBadge: Record<string, { label: string; className: string; dot: string }> = {
  low:      { label: "Basse",    className: "border border-muted-foreground/20 bg-muted/60 text-muted-foreground", dot: "bg-muted-foreground/50" },
  medium:   { label: "Moyenne",  className: "border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",   dot: "bg-blue-500" },
  high:     { label: "Élevée",   className: "border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
  urgent:   { label: "Urgent",   className: "border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",    dot: "bg-red-500" },
};

interface Props {
  task: Task;
  category?: Category;
  subtaskStats?: { done: number; total: number };
  /** Poignée drag-and-drop */
  leadingSlot?: ReactNode;
  variant?: "list" | "board";
}

export const TaskCard = ({ task, category, subtaskStats, leadingSlot, variant = "list" }: Props) => {
  const { openTaskPanel } = useAppStore();
  const overdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== "done";

  const toggleDone = async (checked: boolean) => {
    await supabase.from("tasks").update({ status: checked ? "done" : "todo" }).eq("id", task.id);
  };

  if (variant === "board") {
    return (
      <div
        className={cn(
          "group relative flex w-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20 hover:shadow-md",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2" onPointerDown={(e) => e.stopPropagation()}>
            <Checkbox
              checked={task.status === "done"}
              onCheckedChange={(c) => toggleDone(!!c)}
              className="mt-0.5 rounded-md border-border"
            />
            <button type="button" onClick={() => openTaskPanel(task.id)} className="min-w-0 flex-1 text-left">
              <div
                className={cn(
                  "text-sm font-semibold leading-snug text-foreground",
                  task.status === "done" && "text-muted-foreground line-through",
                )}
              >
                {task.title}
              </div>
            </button>
          </div>
          {leadingSlot}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", priorityBadge[task.priority].className)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", priorityBadge[task.priority].dot)} />
            {priorityBadge[task.priority].label}
          </span>
          {category && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-1.5 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: category.color }} />
              {category.name}
            </span>
          )}
          {task.due_date && (
            <span className={cn("inline-flex items-center gap-1", overdue && "font-medium text-destructive")}>
              <CalendarClock className="h-3 w-3" />
              {format(new Date(task.due_date), "d MMM, HH:mm")}
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
        <div className="flex justify-end border-t border-border/60 pt-2">
          <div className="flex -space-x-2">
            {(task.assigned_to ?? []).slice(0, 4).map((uid) => (
              <Avatar key={uid} className="h-7 w-7 border-2 border-card">
                <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
                  {uid.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex w-full items-center gap-2 rounded-2xl border border-border bg-card px-3 py-3 shadow-sm transition-all hover:border-primary/15 hover:shadow-md sm:gap-3 sm:px-4">
      {leadingSlot}
      <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", priorityBadge[task.priority].className)}>
        <span className={cn("h-1.5 w-1.5 rounded-full", priorityBadge[task.priority].dot)} />
        {priorityBadge[task.priority].label}
      </span>
      <div className="shrink-0" onPointerDown={(e) => e.stopPropagation()}>
        <Checkbox checked={task.status === "done"} onCheckedChange={(c) => toggleDone(!!c)} className="rounded-md" />
      </div>
      <button type="button" onClick={() => openTaskPanel(task.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-medium ${task.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}>
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
                {format(new Date(task.due_date), "d MMM, HH:mm")}
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
        <div className="flex shrink-0 -space-x-2">
          {(task.assigned_to ?? []).slice(0, 3).map((uid) => (
            <Avatar key={uid} className="h-6 w-6 border-2 border-card">
              <AvatarFallback className="bg-primary/10 text-[10px] text-primary">{uid.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </button>
    </div>
  );
};
