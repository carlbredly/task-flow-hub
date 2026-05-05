import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const startOfTomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfTomorrow = () => {
  const date = startOfTomorrow();
  date.setHours(23, 59, 59, 999);
  return date;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1) Auto-switch overdue tasks to delayed
    const { data: overdueTasks } = await supabase
      .from("tasks")
      .select("id,title,assigned_to,due_date,status")
      .lt("due_date", new Date().toISOString())
      .neq("status", "done")
      .neq("status", "delayed");

    if ((overdueTasks ?? []).length > 0) {
      const overdueIds = (overdueTasks ?? []).map((task) => task.id);
      await supabase.from("tasks").update({ status: "delayed" }).in("id", overdueIds);

      const overdueNotifications = (overdueTasks ?? []).flatMap((task) =>
        (task.assigned_to ?? []).map((userId) => ({
          user_id: userId,
          type: "task_overdue",
          title: "Tache en retard",
          message: `${task.title} est maintenant marquee comme en retard.`,
          task_id: task.id,
        })),
      );

      if (overdueNotifications.length > 0) {
        await supabase.from("notifications").insert(overdueNotifications);
      }
    }

    // 2) Reminders for tasks due tomorrow
    const tomorrowStart = startOfTomorrow().toISOString();
    const tomorrowEnd = endOfTomorrow().toISOString();

    const { data: tomorrowTasks } = await supabase
      .from("tasks")
      .select("id,title,assigned_to,due_date,status")
      .gte("due_date", tomorrowStart)
      .lte("due_date", tomorrowEnd)
      .neq("status", "done");

    const tomorrowNotifications = (tomorrowTasks ?? []).flatMap((task) =>
      (task.assigned_to ?? []).map((userId) => ({
        user_id: userId,
        type: "reminder_tomorrow",
        title: "Rappel pour demain",
        message: `${task.title} est prevue demain.`,
        task_id: task.id,
      })),
    );
    if (tomorrowNotifications.length > 0) {
      await supabase.from("notifications").insert(tomorrowNotifications);
    }

    // 3) Reminders 30 minutes before due date
    const now = Date.now();
    const thirtyMinutesFromNow = new Date(now + 30 * 60 * 1000).toISOString();
    const nowIso = new Date(now).toISOString();

    const { data: soonTasks } = await supabase
      .from("tasks")
      .select("id,title,assigned_to,due_date,status")
      .gte("due_date", nowIso)
      .lte("due_date", thirtyMinutesFromNow)
      .neq("status", "done");

    const soonNotifications = (soonTasks ?? []).flatMap((task) =>
      (task.assigned_to ?? []).map((userId) => ({
        user_id: userId,
        type: "task_updated",
        title: "Echeance imminente",
        message: `${task.title} expire bientot.`,
        task_id: task.id,
      })),
    );
    if (soonNotifications.length > 0) {
      await supabase.from("notifications").insert(soonNotifications);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        delayed: overdueTasks?.length ?? 0,
        tomorrowReminders: tomorrowNotifications.length,
        nearDueReminders: soonNotifications.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
