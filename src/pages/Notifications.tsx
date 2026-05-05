import { useMemo, useState } from "react";
import SEO from "@/components/seo/SEO";
import { formatDistanceToNowStrict } from "date-fns";
import { useNavigate } from "react-router-dom";
import { BellRing, CheckCheck, Filter, Clock, UserPlus, AlertTriangle, Info, ArrowUpRight } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fr } from "date-fns/locale";

const iconMap: Record<string, typeof BellRing> = {
  assignation: UserPlus,
  reminder: Clock,
  alert: AlertTriangle,
};

const colorMap: Record<string, string> = {
  assignation: "text-blue-500 bg-blue-500/10",
  reminder: "text-amber-500 bg-amber-500/10",
  alert: "text-red-500 bg-red-500/10",
};

const NotificationsPage = () => {
  const nav = useNavigate();
  const { openTaskPanel } = useAppStore();
  const { notifications, loading, markAllAsRead, markAsRead } = useNotifications();
  const [typeFilter, setTypeFilter] = useState("all");

  const types = useMemo(() => Array.from(new Set(notifications.map((n) => n.type))), [notifications]);
  const filtered = useMemo(
    () => notifications.filter((n) => (typeFilter === "all" ? true : n.type === typeFilter)),
    [notifications, typeFilter],
  );
  const unread = useMemo(() => filtered.filter((n) => !n.read), [filtered]);
  const read = useMemo(() => filtered.filter((n) => n.read), [filtered]);

  const handleClick = async (notification: typeof filtered[0]) => {
    if (!notification.read) await markAsRead(notification.id);
    if (notification.task_id) {
      nav("/tasks");
      openTaskPanel(notification.task_id);
    }
  };

  const NotifCard = ({ notification }: { notification: typeof filtered[0] }) => {
    const isUnread = !notification.read;
    const Icon = iconMap[notification.type] ?? Info;
    const color = colorMap[notification.type] ?? "text-muted-foreground bg-muted/50";

    return (
      <button
        type="button"
        onClick={() => handleClick(notification)}
        className={cn(
          "group relative flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-200 hover:shadow-md",
          isUnread
            ? "border-primary/20 bg-gradient-to-r from-primary/[0.04] to-transparent"
            : "border-border bg-card/60",
        )}
      >
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", color)}>
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm", isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                {notification.title}
              </p>
              {notification.message && (
                <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="whitespace-nowrap text-[11px] text-muted-foreground/70">
                {formatDistanceToNowStrict(new Date(notification.created_at), { addSuffix: true, locale: fr })}
              </span>
              {notification.task_id && (
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
              {notification.type}
            </span>
            {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
          </div>
        </div>
      </button>
    );
  };

  return (
    <>
      <SEO title="Notifications" description="Notifications en temps réel de votre espace de travail Track'm." url="https://taskflowhub.app/notifications" />
      <div className="mx-auto max-w-4xl space-y-6 p-4 pb-24 animate-fade-in sm:p-6 sm:pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {unread.length > 0
                ? `${unread.length} notification${unread.length > 1 ? "s" : ""} non lue${unread.length > 1 ? "s" : ""}`
                : "Tout est à jour"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">Tous les types</option>
              {types.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {unread.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={markAllAsRead}>
                <CheckCheck className="h-3.5 w-3.5" />
                Tout marquer lu
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/80" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
              <BellRing className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Aucune notification</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {typeFilter !== "all" ? "Aucune notification pour ce filtre." : "Vous n'avez pas encore de notifications."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {unread.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Non lues ({unread.length})
                </h2>
                <div className="space-y-2">
                  {unread.map((n) => <NotifCard key={n.id} notification={n} />)}
                </div>
              </section>
            )}
            {read.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">
                  Lues ({read.length})
                </h2>
                <div className="space-y-2">
                  {read.map((n) => <NotifCard key={n.id} notification={n} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationsPage;
