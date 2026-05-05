import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeIcs = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

const formatIcsDate = (value: string) => {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // Support path-based: /bright-function/{workspace_id}/{token}.ics
    const workspaceId = url.searchParams.get("workspace_id") || pathParts[1];
    const token = url.searchParams.get("token") || pathParts[2]?.replace(".ics", "");

    if (!workspaceId || !token) {
      return new Response(JSON.stringify({ error: "workspace_id and token are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id,name,invite_token")
      .eq("id", workspaceId)
      .eq("invite_token", token)
      .single();

    if (workspaceError || !workspace) {
      return new Response(JSON.stringify({ error: "Invalid workspace or token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tasks } = await supabase
      .from("tasks")
      .select("id,title,description,location,due_date")
      .eq("workspace_id", workspaceId)
      .not("due_date", "is", null)
      .neq("status", "done")
      .order("due_date", { ascending: true });

    const now = formatIcsDate(new Date().toISOString());
    const taskLines = (tasks ?? []).flatMap((task) => {
      const due = new Date(task.due_date);
      const end = new Date(due.getTime() + 3600000);
      const uid = `${task.id}@trackm`;

      return [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART:${formatIcsDate(due.toISOString())}`,
        `DTEND:${formatIcsDate(end.toISOString())}`,
        `SUMMARY:${escapeIcs(task.title)}`,
        ...(task.description ? [`DESCRIPTION:${escapeIcs(task.description)}`] : []),
        ...(task.location ? [`LOCATION:${escapeIcs(task.location)}`] : []),
        "END:VEVENT",
      ];
    });

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Trackm//Task Calendar//FR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escapeIcs(workspace.name)} - Track'm`,
      "X-WR-CALDESC:Taches depuis Track'm",
      "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
      "X-PUBLISHED-TTL:PT1H",
      ...taskLines,
      "END:VCALENDAR",
    ].join("\r\n");

    return new Response(ics, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8; method=PUBLISH",
        "Content-Disposition": `attachment; filename="trackm-${workspace.id}.ics"`,
        "Cache-Control": "no-cache, max-age=3600",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
