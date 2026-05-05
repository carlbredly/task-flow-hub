import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/seo/SEO";
import { useTasks, type Task } from "@/hooks/useTasks";
import { useAppStore } from "@/stores/useAppStore";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, ArrowLeft, ListChecks, Target, CalendarClock, ExternalLink } from "lucide-react";
import { format } from "date-fns";

function formatTimer(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

const Focus = () => {
  const nav = useNavigate();
  const { tasks, categories, refetch } = useTasks();
  const { openTaskPanel } = useAppStore();
  const [timerSec, setTimerSec] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerTaskId, setTimerTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => setTimerSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  const startTimer = useCallback(() => {
    if (!timerTaskId) return;
    setTimerRunning(true);
  }, [timerTaskId]);

  const stopTimer = useCallback(async () => {
    if (timerRunning && timerSec > 0 && timerTaskId) {
      await (supabase.rpc as any)("add_time_spent", { task_id: timerTaskId, seconds: timerSec });
      refetch();
    }
    setTimerRunning(false);
    setTimerSec(0);
    setTimerTaskId(null);
  }, [timerRunning, timerSec, timerTaskId, refetch]);

  const timerTask = timerTaskId ? tasks.find((t) => t.id === timerTaskId) : null;

  const rootTasks = useMemo(() => tasks.filter((t) => !t.parent_task_id && t.status !== "done"), [tasks]);

  return (
    <>
      <SEO title="Mode Focus" description="Session de travail en plein écran avec minuteur." />
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6 animate-fade-in sm:px-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => nav(-1)} className="gap-2 rounded-xl">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
          <h1 className="text-lg font-semibold">Mode Focus</h1>
          <div className="w-20" />
        </div>

        <div className="mt-12 flex flex-1 flex-col items-center justify-center gap-8">
          <div className="text-center">
            <p className="text-8xl font-bold tabular-nums tracking-tight sm:text-9xl">
              {formatTimer(timerSec)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Session en cours</p>
          </div>

          <div className="flex gap-4">
            <Button
              size="icon"
              className="h-16 w-16 rounded-full shadow-lg"
              onClick={timerRunning ? () => setTimerRunning(false) : startTimer}
              disabled={!timerTaskId}
            >
              {timerRunning ? <Pause className="h-6 w-6" /> : <Play className="ml-1 h-6 w-6" />}
            </Button>
            <Button
              size="icon"
              variant="destructive"
              className="h-16 w-16 rounded-full shadow-lg"
              onClick={stopTimer}
              disabled={!timerTaskId && timerSec === 0}
            >
              <Square className="h-5 w-5" />
            </Button>
          </div>

          <div className="w-full max-w-lg space-y-3">
            {!timerTaskId ? (
              <div className="space-y-2">
                <p className="text-center text-sm font-medium text-muted-foreground">Sélectionnez une tâche à travailler</p>
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-border bg-card p-2 scrollbar-thin">
                  {rootTasks.map((t) => {
                    const cat = categories.find((c) => c.id === t.category_id);
                    return (
                      <div
                        key={t.id}
                        className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/60"
                      >
                        <button type="button" onClick={() => { setTimerTaskId(t.id); setTimerRunning(true); }} className="flex min-w-0 flex-1 items-center gap-3">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white/50"
                            style={{ background: cat?.color ?? "hsl(220 14% 80%)" }}
                          >
                            {cat?.name?.slice(0, 1).toUpperCase() ?? "?"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                            {t.due_date && (
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                <CalendarClock className="h-3 w-3" />
                                {format(new Date(t.due_date), "d MMM yyyy")}
                              </p>
                            )}
                          </div>
                        </button>
                        <ListChecks className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <button
                          type="button"
                          onClick={() => openTaskPanel(t.id)}
                          className="shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                          title="Voir les détails"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                  {rootTasks.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">Aucune tâche en cours.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary" />
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => timerTaskId && openTaskPanel(timerTaskId)} className="text-left">
                      <p className="truncate text-base font-semibold text-foreground hover:text-primary transition-colors">{timerTask?.title}</p>
                    </button>
                    {timerTask?.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{timerTask.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => timerTaskId && openTaskPanel(timerTaskId)}
                    className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Voir les détails"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Focus;
