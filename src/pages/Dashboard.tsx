import { useTasks } from "@/hooks/useTasks";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertTriangle, ListTodo, TrendingUp, Plus, Video, Pause, Square, Play } from "lucide-react";
import { isPast, isToday, startOfWeek, isAfter, isFuture, format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { TaskCreateDialog } from "@/components/tasks/TaskCreateDialog";
import { useAppStore } from "@/stores/useAppStore";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Task } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";

const tooltipStyle = {
  background: "hsl(0 0% 100%)",
  border: "1px solid hsl(220 14% 90%)",
  borderRadius: 12,
  boxShadow: "0 8px 24px -8px hsl(220 20% 10% / 0.12)",
};

const PRI_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const rootTasks = (tasks: Task[]) => tasks.filter((t) => !t.parent_task_id);

function formatTimer(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

const WEEK_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const Dashboard = () => {
  const { tasks, categories } = useTasks();
  const { openTaskPanel } = useAppStore();
  const { members, loading: membersLoading } = useWorkspaceMembers();
  const [createOpen, setCreateOpen] = useState(false);

  const stats = useMemo(() => {
    const active = tasks.filter((t) => t.status !== "done").length;
    const weekStart = startOfWeek(new Date());
    const completedWeek = tasks.filter(
      (t) => t.status === "done" && t.updated_at && isAfter(new Date(t.updated_at), weekStart),
    ).length;
    const pending = tasks.filter((t) => t.status === "todo" || t.status === "in_progress").length;
    const overdue = tasks.filter((t) => t.due_date && isPast(new Date(t.due_date)) && t.status !== "done").length;
    return { active, completedWeek, pending, overdue };
  }, [tasks]);

  const projectAnalytics = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 0 });
    return Array.from({ length: 7 }).map((_, i) => {
      const dayStart = new Date(start.getTime() + i * 86400000);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const created = tasks.filter((t) => {
        const d = new Date(t.created_at);
        return d >= dayStart && d < dayEnd;
      }).length;
      const done = tasks.filter((t) => {
        if (t.status !== "done") return false;
        const d = new Date(t.updated_at);
        return d >= dayStart && d < dayEnd;
      }).length;
      const ratio = created > 0 ? Math.round((done / created) * 100) : 0;
      return {
        day: WEEK_LABELS[i],
        ratio: Math.max(18, Math.min(100, ratio || (done > 0 ? 34 : 22))),
        hasData: created > 0 || done > 0,
      };
    });
  }, [tasks]);
  const highlightedIndex = useMemo(() => {
    let idx = 0;
    let max = -1;
    projectAnalytics.forEach((x, i) => {
      if (x.hasData && x.ratio > max) {
        max = x.ratio;
        idx = i;
      }
    });
    return idx;
  }, [projectAnalytics]);

  const catFor = (id: string | null) => categories.find((c) => c.id === id);

  const roots = useMemo(() => rootTasks(tasks), [tasks]);

  const nextReminder = useMemo(() => {
    const candidates = roots
      .filter((t) => t.due_date && t.status !== "done")
      .filter((t) => {
        const d = new Date(t.due_date!);
        return isToday(d) || isFuture(d);
      })
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
    return candidates[0] ?? null;
  }, [roots]);

  const projectList = useMemo(() => {
    return [...roots]
      .filter((t) => t.status !== "done")
      .sort((a, b) => {
        const pa = PRI_ORDER[a.priority] ?? 9;
        const pb = PRI_ORDER[b.priority] ?? 9;
        if (pa !== pb) return pa - pb;
        const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return da - db;
      })
      .slice(0, 5);
  }, [roots]);

  const workspaceProgress = useMemo(() => {
    const total = roots.length;
    const done = roots.filter((t) => t.status === "done").length;
    const inProgress = roots.filter((t) => t.status === "in_progress").length;
    const pending = roots.filter((t) => t.status === "todo").length;
    const delayed = roots.filter((t) => t.status === "delayed").length;
    const pct = total > 0 ? Math.round((100 * done) / total) : 0;
    return { total, done, inProgress, pending, delayed, pct };
  }, [roots]);

  const gaugeData = useMemo(() => {
    const { done, total } = workspaceProgress;
    const rest = Math.max(0, total - done);
    return [
      { name: "terminé", value: done, fill: "hsl(145 55% 28%)" },
      { name: "restant", value: rest, fill: "hsl(210 18% 92%)" },
    ];
  }, [workspaceProgress]);

  const memberRows = useMemo(() => {
    return members.map((m) => {
      const assigned = roots
        .filter((t) => t.status !== "done" && (t.assigned_to ?? []).includes(m.user_id))
        .sort((a, b) => {
          const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          return da - db;
        });
      const task = assigned[0];
      return { member: m, task };
    });
  }, [members, roots]);

  const [timerSec, setTimerSec] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => setTimerSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  const stopTimer = useCallback(() => {
    setTimerRunning(false);
    setTimerSec(0);
  }, []);

  const statusBadge = (status: Task["status"] | null) => {
    if (!status) {
      return <Badge variant="secondary">Disponible</Badge>;
    }
    const map: Record<Task["status"], { label: string; className: string }> = {
      done: { label: "Terminé", className: "border-transparent bg-[hsl(145_55%_32%/0.15)] text-[hsl(145_55%_28%)]" },
      in_progress: { label: "En cours", className: "border-transparent bg-warning/15 text-warning" },
      todo: { label: "En attente", className: "border-transparent bg-destructive/10 text-destructive" },
      delayed: { label: "Retard", className: "border-transparent bg-destructive/15 text-destructive" },
    };
    const x = map[status];
    return (
      <Badge variant="outline" className={cn("font-medium", x.className)}>
        {x.label}
      </Badge>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-24 animate-fade-in sm:p-6 sm:pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setCreateOpen(true)} className="rounded-xl shadow-md">
            <Plus className="h-4 w-4" /> Nouvelle tâche
          </Button>
          <Button variant="outline" className="rounded-xl border-border bg-card shadow-sm" type="button" asChild>
            <Link to="/tasks">Voir les tâches</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="relative overflow-hidden rounded-2xl border-0 bg-primary p-5 text-primary-foreground shadow-lg">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-primary-foreground/85">Tâches actives</span>
            <ListTodo className="h-4 w-4 opacity-90" />
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight">{stats.active}</div>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-primary-foreground/80">
            <TrendingUp className="h-3 w-3" /> En cours dans l’espace
          </p>
        </Card>
        <Card className="rounded-2xl border-border bg-card p-5 shadow-md">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-muted-foreground">Terminées (semaine)</span>
            <CheckCircle2 className="h-4 w-4 text-[hsl(145_55%_32%)]" />
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-foreground">{stats.completedWeek}</div>
          <p className="mt-2 text-[11px] text-muted-foreground">Depuis le début de la semaine</p>
        </Card>
        <Card className="rounded-2xl border-border bg-card p-5 shadow-md">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-muted-foreground">À traiter</span>
            <Clock className="h-4 w-4 text-[hsl(217_91%_50%)]" />
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-foreground">{stats.pending}</div>
          <p className="mt-2 text-[11px] text-muted-foreground">À faire + en cours</p>
        </Card>
        <Card className="rounded-2xl border-border bg-card p-5 shadow-md">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-muted-foreground">En retard</span>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-foreground">{stats.overdue}</div>
          <p className="mt-2 text-[11px] text-muted-foreground">Échéances dépassées</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="flex max-h-[300px] flex-col rounded-2xl border border-border bg-card p-5 shadow-md lg:col-span-2">
          <h3 className="shrink-0 text-sm font-semibold">Analyse projet</h3>
          <div className="mt-auto grid grid-cols-7 items-end gap-3">
            {projectAnalytics.map((x, i) => {
              const isHighlighted = i === highlightedIndex && x.hasData;
              const isFilled = x.hasData;
              const ratio = Math.min(Math.max(x.ratio, 0), 100);
              return (
                <div key={`${x.day}-${i}`} className="flex flex-col items-center">
                  <div className="relative flex h-28 items-end">
                    {isHighlighted && (
                      <span className="absolute -top-6 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                        {ratio}%
                      </span>
                    )}
                    <div
                      className="w-10 rounded-full transition-all duration-300"
                      style={{
                        height: `${ratio}%`,
                        background: isFilled
                          ? isHighlighted
                            ? "hsl(152 51% 59%)"
                            : "hsl(145 55% 23%)"
                          : "repeating-linear-gradient(135deg, hsl(200 10% 72%) 0px, hsl(200 10% 72%) 3px, transparent 3px, transparent 7px)",
                        opacity: isFilled ? 1 : 0.8,
                      }}
                    />
                  </div>
                  <span className="mt-2 text-xs text-muted-foreground">{x.day}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="flex flex-col rounded-2xl border-border bg-card p-5 shadow-md">
          <h3 className="text-sm font-semibold">Rappels</h3>
          <p className="mt-1 text-xs text-muted-foreground">Prochaine échéance à venir</p>
          {nextReminder ? (
            <div className="mt-3 flex min-h-0 flex-1 flex-col">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-sm font-medium text-foreground">{nextReminder.title}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {nextReminder.due_date && format(new Date(nextReminder.due_date), "d MMM yyyy · HH:mm")}
                </p>
              </div>
              <Button
                className="mt-3 w-full rounded-xl gap-2"
                onClick={() => openTaskPanel(nextReminder.id)}
                type="button"
                size="sm"
              >
                <Video className="h-3.5 w-3.5" />
                Ouvrir la tâche
              </Button>
            </div>
          ) : (
            <p className="mt-3 flex-1 text-sm text-muted-foreground">Aucun rappel à venir.</p>
          )}
        </Card>

        <Card className="flex max-h-[300px] flex-col rounded-2xl border-border bg-card p-5 shadow-md lg:col-span-2">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Projets & priorités</h3>
              <p className="text-xs text-muted-foreground">Tâches racines les plus urgentes</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl shrink-0" asChild>
              <Link to="/tasks">
                <Plus className="max-h-3.5 w-3.5" /> Nouveau
              </Link>
            </Button>
          </div>
          <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto scrollbar-thin">
            {projectList.length === 0 && <li className="text-sm text-muted-foreground">Rien en cours — bravo !</li>}
            {projectList.map((t) => {
              const cat = catFor(t.category_id);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => openTaskPanel(t.id)}
                    className="flex w-full items-start gap-2 rounded-xl border border-transparent px-2 py-1.5 text-left transition-colors hover:border-border hover:bg-muted/40"
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-center text-xs font-medium text-white/50"
                      style={{ background: cat?.color ?? "hsl(220 14% 80%)" }} 
                    >
                      {cat?.name?.slice(0,1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-xs font-medium text-foreground">{t.title}</span>
                      {t.due_date && (
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {format(new Date(t.due_date), "d MMM yyyy")}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="rounded-2xl border-border bg-card p-5 shadow-md lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Collaboration d'équipe</h3>
              <p className="text-xs text-muted-foreground">Membres et tâche en cours</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <Link to="/settings">
                <Plus className="h-3.5 w-3.5" /> Inviter
              </Link>
            </Button>
          </div>
          <div className="mt-3 space-y-2 max-h-[180px] overflow-y-auto scrollbar-thin">
            {membersLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
            {!membersLoading && memberRows.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun membre pour cet espace.</p>
            )}
            {!membersLoading &&
              memberRows.map(({ member: m, task: t }) => (
                <div
                  key={m.user_id}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 px-2 py-2 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Avatar className="h-8 w-8 border-2 border-card shadow-sm">
                      <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
                        {(m.profile?.display_name ?? m.profile?.email ?? m.user_id).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{m.profile?.display_name ?? m.profile?.email ?? "Membre"}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{t?.title ?? "Aucune tâche assignée"}</p>
                    </div>
                  </div>
                  <div className="shrink-0 sm:ml-auto">{statusBadge(t?.status ?? null)}</div>
                </div>
              ))}
          </div>
        </Card>

        <Card className="rounded-2xl border-border bg-card p-5 shadow-md">
          <h3 className="text-sm font-semibold">Progression du workspace</h3>
          <p className="mt-1 text-xs text-muted-foreground">Tâches racines terminées</p>
          {workspaceProgress.total > 0 ? (
            <div className="relative mx-auto mt-2 h-32 w-full max-w-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gaugeData}
                    dataKey="value"
                    cx="50%"
                    cy="85%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={48}
                    outerRadius={65}
                    stroke="none"
                  >
                    {gaugeData.map((_, i) => (
                      <Cell key={i} fill={gaugeData[i].fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-1 text-center">
                <span className="text-2xl font-bold tabular-nums text-foreground">{workspaceProgress.pct}%</span>
                <span className="text-[10px] text-muted-foreground">tâches terminées</span>
              </div>
            </div>
          ) : null}
          {workspaceProgress.total > 0 && (
            <div className="mt-1 space-y-1.5">
              <Progress value={workspaceProgress.pct} className="h-1.5 bg-muted" />
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(145_55%_28%)]" />
                  Terminé ({workspaceProgress.done})
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(217_91%_55%)]" />
                  En cours ({workspaceProgress.inProgress})
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(210_18%_88%)]" />
                  À faire ({workspaceProgress.pending + workspaceProgress.delayed})
                </span>
              </div>
            </div>
          )}
          {workspaceProgress.total === 0 && <p className="mt-4 text-sm text-muted-foreground">Créez des tâches pour suivre la progression.</p>}
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border-0 bg-primary p-5 text-primary-foreground shadow-lg">
          <div
            className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10"
            aria-hidden
          />
          <h3 className="relative text-sm font-semibold text-primary-foreground">Minuteur</h3>
          <p className="relative mt-1 text-xs text-primary-foreground/80">Session de focus locale</p>
          <p className="relative mt-4 text-center font-mono text-3xl font-semibold tabular-nums tracking-tight">
            {formatTimer(timerSec)}
          </p>
          <div className="relative mt-4 flex justify-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-full border-0 bg-white/20 text-primary-foreground hover:bg-white/30"
              onClick={() => setTimerRunning((r) => !r)}
              aria-label={timerRunning ? "Pause" : "Démarrer"}
            >
              {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-full border-0 bg-destructive/90 text-destructive-foreground hover:bg-destructive"
              onClick={stopTimer}
              aria-label="Arrêter et réinitialiser"
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      </div>

      <TaskCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};

export default Dashboard;
