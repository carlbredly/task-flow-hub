import { useMemo, useState } from "react";
import SEO from "@/components/seo/SEO";
import { formatDistanceToNowStrict } from "date-fns";
import { useNavigate } from "react-router-dom";
import { BellRing, CheckCheck, Filter, Bell } from "lucide-react";
import { useNotifications, requestNotificationPermission, showBrowserNotification } from "@/hooks/useNotifications";
import { useAppStore } from "@/stores/useAppStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NotificationsPage = () => {
  const nav = useNavigate();
  const { openTaskPanel } = useAppStore();
  const { notifications, loading, markAllAsRead, markAsRead } = useNotifications();
  const [typeFilter, setTypeFilter] = useState("all");

  const types = useMemo(() => Array.from(new Set(notifications.map((notification) => notification.type))), [notifications]);
  const filtered = useMemo(
    () => notifications.filter((notification) => (typeFilter === "all" ? true : notification.type === typeFilter)),
    [notifications, typeFilter],
  );

  return (
    <>
      <SEO title="Notifications" description="Notifications en temps réel de votre espace de travail Track'm : rappels, échéances et activité d'équipe." url="https://taskflowhub.app/notifications" />
      <div className="mx-auto max-w-5xl space-y-5 p-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground">Realtime updates from your workspace activity.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[190px] bg-card">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5" />
                <SelectValue placeholder="Filter by type" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {types.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { requestNotificationPermission(); showBrowserNotification("Test Track'm", "Si vous voyez ceci, les notifications push fonctionnent !"); }}>
            <Bell className="h-3.5 w-3.5" />
            Tester
          </Button>
          <Button variant="outline" className="gap-2" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-card" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-white/10 p-12 text-center">
          <BellRing className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No notifications for this filter.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((notification) => (
            <button
              key={notification.id}
              onClick={async () => {
                if (!notification.read) {
                  await markAsRead(notification.id);
                }
                if (notification.task_id) {
                  nav("/tasks");
                  openTaskPanel(notification.task_id);
                }
              }}
              className={`w-full rounded-xl border p-4 text-left transition ${
                notification.read ? "border-white/5 bg-card/60" : "border-primary/30 bg-primary/5"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{notification.title}</p>
                  {notification.message && <p className="mt-1 text-xs text-muted-foreground">{notification.message}</p>}
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground/80">
                    {notification.type}
                  </p>
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  {formatDistanceToNowStrict(new Date(notification.created_at), { addSuffix: true })}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
    </>
  );
};

export default NotificationsPage;
