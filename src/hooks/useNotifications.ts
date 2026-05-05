import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { randomUUID } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

export type NotificationItem = Database["public"]["Tables"]["notifications"]["Row"];

let permRequested = false;
async function requestNotifPermission() {
  if (!("Notification" in window) || permRequested) return;
  permRequested = true;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

function showBrowserNotification(title: string, body?: string, taskId?: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const n = new Notification(title, {
    body,
    icon: "/favicon.svg",
    tag: taskId ?? "trackm",
  });
  if (taskId) {
    n.onclick = () => {
      window.focus();
      window.dispatchEvent(new CustomEvent("trackm:open-task", { detail: { taskId } }));
    };
  }
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const prevCountRef = useRef(0);
  /** Unique topic per hook instance — Header + MobileBottomNav both use this hook; same name would reuse a channel already subscribed. */
  const realtimeInstanceId = useRef(randomUUID());
  const fetchNotificationsRef = useRef<() => Promise<void>>(async () => {});

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setNotifications(data ?? []);
    setLoading(false);
  }, [user]);

  fetchNotificationsRef.current = fetchNotifications;

  useEffect(() => {
    fetchNotifications();
    requestNotifPermission();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;
    const topic = `notifications:${user.id}:${realtimeInstanceId.current}`;
    const channel = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          void fetchNotificationsRef.current().then(() => {
            const newNotif = payload.new as NotificationItem | null;
            if (newNotif && newNotif.user_id === user?.id && !newNotif.read) {
              showBrowserNotification(newNotif.title, newNotif.message ?? undefined, newNotif.task_id ?? undefined);
            }
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    await fetchNotifications();
  }, [fetchNotifications, user]);

  const markAsRead = useCallback(
    async (id: string) => {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
      await fetchNotifications();
    },
    [fetchNotifications],
  );

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
};
