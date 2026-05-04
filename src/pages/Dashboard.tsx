import { useTasks } from "@/hooks/useTasks";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertTriangle, ListTodo } from "lucide-react";
import { isPast, isToday, startOfWeek, isAfter } from "date-fns";
import { TaskCard } from "@/components/tasks/TaskCard";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { useMemo } from "react";

const KPI = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: string }) => (
  <Card className="surface-card border-white/5 p-5">
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Icon className={`h-4 w-4 ${tone}`} />
    </div>
    <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
  </Card>
);

const COLORS = { done: "hsl(160 84% 39%)", pending: "hsl(239 84% 67%)", delayed: "hsl(0 84% 60%)" };

const Dashboard = () => {
  const { tasks, categories } = useTasks();

  const stats = useMemo(() => {
    const active = tasks.filter((t) => t.status !== "done").length;
    const weekStart = startOfWeek(new Date());
    const completedWeek = tasks.filter((t) => t.status === "done" && t.updated_at && isAfter(new Date(t.updated_at), weekStart)).length;
    const pending = tasks.filter((t) => t.status === "todo" || t.status === "in_progress").length;
    const overdue = tasks.filter((t) => t.due_date && isPast(new Date(t.due_date)) && t.status !== "done").length;
    return { active, completedWeek, pending, overdue };
  }, [tasks]);

  const pie = [
    { name: "Done", value: tasks.filter((t) => t.status === "done").length, color: COLORS.done },
    { name: "Pending", value: tasks.filter((t) => t.status === "todo" || t.status === "in_progress").length, color: COLORS.pending },
    { name: "Delayed", value: tasks.filter((t) => t.status === "delayed").length, color: COLORS.delayed },
  ];

  const today = tasks.filter((t) => t.due_date && isToday(new Date(t.due_date)));
  const overdueList = tasks.filter((t) => t.due_date && isPast(new Date(t.due_date)) && t.status !== "done").slice(0, 5);
  const recentDone = tasks.filter((t) => t.status === "done").slice(0, 5);

  // simple weekly bar (last 6 weeks)
  const bar = useMemo(() => {
    const arr: { week: string; created: number; done: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = startOfWeek(new Date(Date.now() - i * 7 * 86400000));
      const end = new Date(start.getTime() + 7 * 86400000);
      arr.push({
        week: `W${start.getDate()}/${start.getMonth() + 1}`,
        created: tasks.filter((t) => new Date(t.created_at) >= start && new Date(t.created_at) < end).length,
        done: tasks.filter((t) => t.status === "done" && new Date(t.updated_at) >= start && new Date(t.updated_at) < end).length,
      });
    }
    return arr;
  }, [tasks]);

  const catFor = (id: string | null) => categories.find((c) => c.id === id);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 animate-fade-in">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI icon={ListTodo} label="Active tasks" value={stats.active} tone="text-primary" />
        <KPI icon={CheckCircle2} label="Done this week" value={stats.completedWeek} tone="text-success" />
        <KPI icon={Clock} label="Pending" value={stats.pending} tone="text-warning" />
        <KPI icon={AlertTriangle} label="Overdue" value={stats.overdue} tone="text-destructive" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="surface-card border-white/5 p-5">
          <h3 className="text-sm font-semibold">Status breakdown</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {pie.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(240 14% 9%)", border: "1px solid hsl(0 0% 100% / 0.06)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="surface-card border-white/5 p-5">
          <h3 className="text-sm font-semibold">Last 6 weeks</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={bar}>
                <XAxis dataKey="week" stroke="hsl(215 16% 47%)" fontSize={10} />
                <YAxis stroke="hsl(215 16% 47%)" fontSize={10} />
                <Tooltip contentStyle={{ background: "hsl(240 14% 9%)", border: "1px solid hsl(0 0% 100% / 0.06)", borderRadius: 8 }} />
                <Bar dataKey="created" fill="hsl(239 84% 67%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="done" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="surface-card border-white/5 p-5">
          <h3 className="mb-3 text-sm font-semibold">Today</h3>
          <div className="space-y-2">
            {today.length === 0 && <p className="text-xs text-muted-foreground">Nothing due today.</p>}
            {today.map((t) => <TaskCard key={t.id} task={t} category={catFor(t.category_id)} />)}
          </div>
        </Card>
        <Card className="surface-card border-white/5 p-5">
          <h3 className="mb-3 text-sm font-semibold text-destructive">Overdue</h3>
          <div className="space-y-2">
            {overdueList.length === 0 && <p className="text-xs text-muted-foreground">All clear.</p>}
            {overdueList.map((t) => <TaskCard key={t.id} task={t} category={catFor(t.category_id)} />)}
          </div>
        </Card>
        <Card className="surface-card border-white/5 p-5">
          <h3 className="mb-3 text-sm font-semibold text-success">Recently done</h3>
          <div className="space-y-2">
            {recentDone.length === 0 && <p className="text-xs text-muted-foreground">Complete a task to see it here.</p>}
            {recentDone.map((t) => <TaskCard key={t.id} task={t} category={catFor(t.category_id)} />)}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
