import { useMemo } from "react";
import { format, differenceInDays, addDays, startOfDay, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { useTasks } from "@/hooks/useTasks";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";

const BAR_COLORS: Record<string, string> = {
  todo: "bg-[hsl(217_91%_65%)]",
  in_progress: "bg-[hsl(38_92%_55%)]",
  delayed: "bg-destructive",
  done: "bg-[hsl(145_45%_40%)]",
};

const GanttView = () => {
  const { tasks, categories } = useTasks();
  const { openTaskPanel } = useAppStore();

  const { ganttTasks, minDate, maxDate, totalDays } = useMemo(() => {
    const withDates = tasks
      .filter((t) => !t.parent_task_id && t.due_date)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

    if (withDates.length === 0) {
      const now = new Date();
      return { ganttTasks: withDates, minDate: now, maxDate: addDays(now, 14), totalDays: 14 };
    }

    const dates = withDates.map((t) => new Date(t.due_date!));
    const min = startOfDay(new Date(Math.min(...dates.map((d) => d.getTime()))));
    const max = startOfDay(new Date(Math.max(...dates.map((d) => d.getTime()))));
    const paddedMin = addDays(min, -2);
    const paddedMax = addDays(max, 2);
    const days = Math.max(differenceInDays(paddedMax, paddedMin), 7);

    return { ganttTasks: withDates, minDate: paddedMin, maxDate: paddedMax, totalDays: days };
  }, [tasks]);

  if (ganttTasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
        <p className="text-sm text-muted-foreground">
          Aucune tâche avec date d'échéance. Ajoutez des dates pour voir la timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm scrollbar-thin">
      <div className="min-w-[600px]">
        {/* Header — month labels */}
        <div className="flex border-b border-border">
          <div className="w-[200px] shrink-0 p-3 text-xs font-semibold text-muted-foreground">Tâche</div>
          <div className="flex flex-1">
            {Array.from({ length: totalDays }).map((_, i) => {
              const d = addDays(minDate, i);
              const isMonday = d.getDay() === 1;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 border-r border-border/40 py-2 text-center text-[9px] text-muted-foreground",
                    isMonday && "border-r-border",
                  )}
                >
                  {isMonday && format(d, "dd MMM", { locale: fr })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rows */}
        {ganttTasks.map((task) => {
          const cat = categories.find((c) => c.id === task.category_id);
          const dueDate = new Date(task.due_date!);
          const offsetDays = Math.max(0, differenceInDays(startOfDay(dueDate), minDate));
          const barWidth = 3; // fixed width in days

          return (
            <div key={task.id} className="flex border-b border-border/30 transition-colors hover:bg-muted/20">
              <button
                type="button"
                onClick={() => openTaskPanel(task.id)}
                className="flex w-[200px] shrink-0 items-center gap-2 p-2.5 text-left"
              >
                {cat && (
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cat.color }} />
                )}
                <span className="truncate text-xs font-medium">{task.title}</span>
              </button>
              <div className="relative flex flex-1 items-center py-1">
                <div
                  className={cn(
                    "absolute h-7 rounded-full opacity-80 transition-opacity hover:opacity-100 cursor-pointer",
                    BAR_COLORS[task.status] ?? "bg-muted-foreground",
                  )}
                  style={{
                    left: `${(offsetDays / totalDays) * 100}%`,
                    width: `${Math.max((barWidth / totalDays) * 100, 2)}%`,
                    minWidth: 8,
                  }}
                  onClick={() => openTaskPanel(task.id)}
                  title={`${task.title} — ${format(dueDate, "d MMM yyyy", { locale: fr })}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GanttView;
