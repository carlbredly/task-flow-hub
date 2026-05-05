import SEO from "@/components/seo/SEO";
import { useTasks } from "@/hooks/useTasks";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertTriangle, ListTodo, TrendingUp, Plus, Video, Pause, Square, Play } from "lucide-react";
import { isPast, isToday, startOfWeek, isAfter, isFuture, format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, CartesianGrid } from "recharts";
import { useMemo, useState, useEffect, useCallback } from "react";
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

const PRI_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const rootTasks = (tasks: Task[]) => tasks.filter((t) => !t.parent_task_id);

function formatTimer(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

const WEEK_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

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
      return { day: WEEK_LABELS[i], created, done, ratio, hasData: created > 0 || done > 0 };
    });
  }, [tasks]);

  const maxAnalytics = useMemo(
    () => Math.max(...projectAnalytics.map((d) => Math.max(d.created, d.done)), 1),
    [projectAnalytics],
  );
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
    <>
      <SEO title="Tableau de bord" description="Vue d'ensemble de votre espace de travail : tâches actives, progression, rappels et collaboration d'équipe." url="https://taskflowhub.app/" />
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
            <TrendingUp className="h-3 w-3" /> En cours dans l'espace
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

      {/* Row 1: Analyse · Rappels · Projets */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-md lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Analyse projet</h3>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-[#38BDF8]" />
                Créées
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                Terminées
              </span>
            </div>
          </div>
          <div className="mt-auto">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={projectAnalytics} margin={{ top: 12, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="doneGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" strokeDasharray="2 3" vertical={false} />
                <XAxis dataKey="day" axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickLine={{ stroke: "rgba(255,255,255,0.08)" }} tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.9)", fontWeight: 600, marginBottom: 4 }}
                  itemStyle={{ color: "rgba(255,255,255,0.75)", padding: "1px 0" }}
                  formatter={(value: number, name: string) => [value, name === "created" ? "Créées" : "Terminées"]}
                />
                <Area type="monotone" dataKey="created" stroke="#38BDF8" strokeWidth={2} fill="url(#createdGrad)" dot={{ r: 2.5, fill: "#38BDF8", stroke: "#0A0A0F", strokeWidth: 1.5 }} activeDot={{ r: 4, fill: "#38BDF8", stroke: "#0A0A0F", strokeWidth: 2 }} />
                <Area type="monotone" dataKey="done" stroke="#F59E0B" strokeWidth={2.5} fill="url(#doneGrad)" dot={{ r: 2.5, fill: "#F59E0B", stroke: "#0A0A0F", strokeWidth: 1.5 }} activeDot={{ r: 4, fill: "#F59E0B", stroke: "#0A0A0F", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="flex flex-col rounded-2xl border-border bg-card p-5 shadow-md">
          <h3 className="text-sm font-semibold">Rappels</h3>
          <p className="mt-1 text-xs text-muted-foreground">Prochaine échéance</p>
          {nextReminder ? (
            <div className="mt-3 flex flex-1 flex-col">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">{nextReminder.title}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {nextReminder.due_date && format(new Date(nextReminder.due_date), "d MMM · HH:mm")}
                </p>
              </div>
              <Button className="mt-auto w-full rounded-xl gap-1.5" onClick={() => openTaskPanel(nextReminder.id)} type="button" size="sm">
                <Video className="h-3.5 w-3.5" />
                Ouvrir
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Aucun rappel à venir.</p>
          )}
        </Card>

        <Card className="flex flex-col rounded-2xl border-border bg-card p-5 shadow-md lg:col-span-2 max-h-[250px]">
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
                    className="flex w-full items-start gap-2.5 rounded-xl border border-transparent px-2 py-1.5 text-left transition-colors hover:border-border hover:bg-muted/40"
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
      </div>

      {/* Row 2: Collaboration · Progression · Minuteur */}
      <div className="grid gap-4 lg:grid-cols-5">
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
          <div className="mt-4 space-y-3">
            {membersLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
            {!membersLoading && memberRows.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun membre pour cet espace.</p>
            )}
            {!membersLoading &&
              memberRows.map(({ member: m, task: t }) => (
                <div
                  key={m.user_id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 px-3 py-3 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-card shadow-sm">
                      <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                        {(m.profile?.display_name ?? m.profile?.email ?? m.user_id).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.profile?.display_name ?? m.profile?.email ?? "Membre"}</p>
                      <p className="truncate text-xs text-muted-foreground">{t?.title ?? "Aucune tâche assignée"}</p>
                    </div>
                  </div>
                  <div className="shrink-0 sm:ml-auto">{statusBadge(t?.status ?? null)}</div>
                </div>
              ))}
          </div>
        </Card>

        <Card className="rounded-2xl border-border bg-card p-5 shadow-md">
          <h3 className="text-sm font-semibold">Progression</h3>
          <p className="mt-1 text-xs text-muted-foreground">Tâches racines terminées</p>
          {workspaceProgress.total > 0 ? (
            <div className="relative mx-auto mt-2 h-36 w-full max-w-[180px]">
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
                <span className="text-[10px] text-muted-foreground">terminées</span>
              </div>
            </div>
          ) : null}
          {workspaceProgress.total > 0 && (
            <div className="mt-1 space-y-1.5">
              <Progress value={workspaceProgress.pct} className="h-1.5 bg-muted" />
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(145_55%_28%)]" />
                  {workspaceProgress.done}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(217_91%_55%)]" />
                  {workspaceProgress.inProgress}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(210_18%_88%)]" />
                  {workspaceProgress.pending + workspaceProgress.delayed}
                </span>
              </div>
            </div>
          )}
          {workspaceProgress.total === 0 && <p className="mt-4 text-sm text-muted-foreground">Créez des tâches pour suivre la progression.</p>}
        </Card>

        <Card className="overflow-hidden rounded-2xl border-0 bg-primary p-5 text-primary-foreground shadow-lg">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" aria-hidden />
          <div className="pointer-events-none absolute -bottom-8 left-1/4 h-32 w-32 rounded-full bg-white/5" aria-hidden />
          <h3 className="relative text-sm font-semibold text-primary-foreground">Minuteur</h3>
          <p className="relative mt-1 text-xs text-primary-foreground/80">Focus local</p>
          <p className="relative mt-4 text-center font-mono text-3xl font-semibold tabular-nums tracking-tight">
            {formatTimer(timerSec)}
          </p>
          <div className="relative mt-4 flex justify-center gap-2">
            <Button type="button" size="icon" variant="secondary"
              className="h-10 w-10 rounded-full border-0 bg-white/20 text-primary-foreground hover:bg-white/30"
              onClick={() => setTimerRunning((r) => !r)}
              aria-label={timerRunning ? "Pause" : "Démarrer"}
            >
              {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </Button>
            <Button type="button" size="icon" variant="secondary"
              className="h-10 w-10 rounded-full border-0 bg-destructive/90 text-destructive-foreground hover:bg-destructive"
              onClick={stopTimer}
              aria-label="Arrêter"
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      </div>
      <TaskCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
    </>
  );
};

export default Dashboard;
