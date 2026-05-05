import { useCallback, useMemo, useState } from "react";
import { format, getDay, getDaysInMonth, startOfMonth, addMonths, subMonths, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { useTasks } from "@/hooks/useTasks";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const priorityDot: Record<string, string> = {
  low: "bg-muted-foreground/60",
  medium: "bg-[hsl(217_91%_50%)]",
  high: "bg-warning",
  urgent: "bg-destructive",
};

const CalendarPage = () => {
  const { tasks } = useTasks();
  const { currentWorkspace, openTaskPanel } = useAppStore();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));

  const calendarTasks = useMemo(
    () => tasks.filter((task) => !task.parent_task_id && task.due_date),
    [tasks],
  );

  const daysInMonth = useMemo(() => {
    const daysCount = getDaysInMonth(currentMonth);
    const startDay = getDay(startOfMonth(currentMonth)); // 0 = dimanche
    const offset = startDay === 0 ? 6 : startDay - 1; // lundi = 0

    const days: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let d = 1; d <= daysCount; d++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [currentMonth]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, typeof calendarTasks>();
    calendarTasks.forEach((task) => {
      const key = new Date(task.due_date!).toDateString();
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    });
    return map;
  }, [calendarTasks]);

  const goToPrevMonth = useCallback(() => setCurrentMonth((m) => subMonths(m, 1)), []);
  const goToNextMonth = useCallback(() => setCurrentMonth((m) => addMonths(m, 1)), []);

  const getIcalUrl = () => {
    if (!currentWorkspace) return "";
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bright-function/${currentWorkspace.id}/${currentWorkspace.invite_token}.ics`;
  };

  const handleCopyIcalLink = () => {
    const url = getIcalUrl();
    if (!url) return;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Lien copié. Collez-le dans votre agenda (iPhone : Réglages > Calendrier > Comptes > Agenda abonné)"))
      .catch(() => toast.error("Impossible de copier le lien"));
  };

  const handleImportPhoneCalendar = () => {
    const icalUrl = getIcalUrl();
    if (!icalUrl) {
      toast.error("No workspace selected");
      return;
    }
    const webcalUrl = icalUrl.replace(/^https/, "webcal");
    window.open(webcalUrl, "_blank");
    handleCopyIcalLink();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-3 py-4 animate-fade-in sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Calendar view</h2>
          <p className="text-sm text-muted-foreground">
            Tasks grouped by due date. Click any task to open the detail panel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleImportPhoneCalendar} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Download className="h-4 w-4" />
            Importer dans mon calendrier telephone
          </Button>
          <Button variant="outline" size="icon" onClick={handleCopyIcalLink} className="h-10 w-10 shrink-0 rounded-xl" aria-label="Copier le lien iCal">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-5">
        {/* Month navigation */}
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </h3>
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="mb-1 grid grid-cols-7">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-1 text-center text-xs font-medium text-muted-foreground">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.slice(0, 1)}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
          {daysInMonth.map((day, i) => {
            const taskList = day ? tasksByDay.get(day.toDateString()) ?? [] : [];
            const dayNum = day ? day.getDate() : null;
            const today = day ? isToday(day) : false;

            return (
              <div
                key={i}
                className={cn(
                  "min-h-[72px] bg-card p-1 sm:min-h-[100px] sm:p-1.5",
                  !day && "bg-muted/20",
                )}
              >
                {dayNum && (
                  <>
                    <span
                      className={cn(
                        "mb-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium sm:h-6 sm:w-6 sm:text-xs",
                        today
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground",
                      )}
                    >
                      {dayNum}
                    </span>
                    <div className="space-y-0.5">
                      {taskList.slice(0, 2).map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => openTaskPanel(task.id)}
                          className="block w-full truncate rounded px-1 py-0.5 text-left text-[10px] leading-tight hover:bg-muted sm:text-xs"
                        >
                          <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full align-middle", priorityDot[task.priority])} />{" "}
                          {task.title}
                        </button>
                      ))}
                      {taskList.length > 2 && (
                        <p className="px-1 text-[10px] text-muted-foreground">+{taskList.length - 2}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {calendarTasks.length === 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No task has a due date yet. Add dates from task details to see them here.
          </p>
        )}
      </div>
    </div>
  );
};

export default CalendarPage;
