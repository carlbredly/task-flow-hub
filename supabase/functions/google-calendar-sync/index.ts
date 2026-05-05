import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncPayload {
  task_id: string;
  access_token: string;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await request.json()) as SyncPayload;
    if (!payload.task_id || !payload.access_token) {
      return new Response(JSON.stringify({ error: "task_id and access_token are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id,title,description,location,due_date,google_event_id")
      .eq("id", payload.task_id)
      .single();

    if (taskError || !task) {
      return new Response(JSON.stringify({ error: "Task not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!task.due_date) {
      return new Response(JSON.stringify({ error: "Task due_date is required for Google sync" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const start = new Date(task.due_date);
    const end = new Date(start.getTime() + 3600000);
    const body = {
      summary: task.title,
      description: task.description ?? "",
      location: task.location ?? "",
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    };

    const endpoint = task.google_event_id
      ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${task.google_event_id}`
      : "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    const method = task.google_event_id ? "PATCH" : "POST";

    const googleResponse = await fetch(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${payload.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!googleResponse.ok) {
      const reason = await googleResponse.text();
      return new Response(JSON.stringify({ error: reason }), {
        status: googleResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const googleEvent = await googleResponse.json();

    await supabase.from("tasks").update({ google_event_id: googleEvent.id }).eq("id", payload.task_id);

    return new Response(JSON.stringify({ ok: true, google_event_id: googleEvent.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
