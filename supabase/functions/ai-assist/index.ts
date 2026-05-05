import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

interface TaskOutput {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  category: string;
  time_spent: number;
}

interface ReqBody {
  type: "reformulate-title" | "generate-description" | "generate-subtasks" | "chat" | "daily-summary" | "focus-recommendation";
  title?: string;
  description?: string | null;
  tasks?: TaskOutput[];
  categories?: string[];
  message?: string;
}

const systemPrompts: Record<string, string> = {
  "reformulate-title": `Tu es un assistant productivité. Reformule le titre de tâche suivant pour qu'il soit clair, concis et actionable. Réponds UNIQUEMENT avec le nouveau titre, sans guillemets ni préfixe.`,
  "generate-description": `Tu es un assistant productivité. Rédige une description détaillée et professionnelle pour cette tâche en français (2-4 phrases). Sois concret et utile. Réponds UNIQUEMENT avec la description.`,
  "generate-subtasks": `Tu es un assistant productivité. Génère 3-5 sous-tâches concrètes et actionnables en français pour cette tâche. 
Réponds UNIQUEMENT au format JSON : ["sous-tâche 1", "sous-tâche 2", ...]`,
  "chat": `Tu es un assistant productivité intégré à un gestionnaire de tâches. Tu aides l'utilisateur à analyser, organiser et améliorer ses tâches. Sois concis et pratique. Réponds en français.`,
  "daily-summary": `Tu es un coach productivité. Analyse les tâches fournies et rédige un résumé quotidien en 2-3 phrases en français :
- Combien de tâches sont en cours, en retard, terminées
- Un conseil actionable pour la journée
Sois encourageant et direct.`,
  "focus-recommendation": `Tu es un coach productivité. Analyse les tâches fournies et recommande LA tâche la plus prioritaire à faire maintenant. Justifie en 1 phrase. Réponds UNIQUEMENT au format JSON : {"taskId": "id-de-la-tache", "reason": "raison en français"}`,
};

async function callDeepSeek(messages: { role: string; content: string }[]) {
  const key = Deno.env.get("DEEPSEEK_KEY");
  if (!key) return new Response(JSON.stringify({ error: "DEEPSEEK_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "deepseek-chat", messages, temperature: 0.7, max_tokens: 1024 }),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: err }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body: ReqBody = await req.json();
    const system = systemPrompts[body.type];
    if (!system) return new Response(JSON.stringify({ error: "Unknown type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let userContent = "";

    switch (body.type) {
      case "reformulate-title":
        userContent = body.title ?? "";
        break;
      case "generate-description":
        userContent = `Titre : ${body.title ?? ""}\nDescription actuelle : ${body.description ?? "(vide)"}`;
        break;
      case "generate-subtasks":
        userContent = `Titre : ${body.title ?? ""}\nDescription : ${body.description ?? ""}`;
        break;
      case "chat":
        userContent = `Contexte - Titre : ${body.title ?? ""}\nDescription : ${body.description ?? ""}\n\nQuestion de l'utilisateur : ${body.message ?? ""}`;
        break;
      case "daily-summary":
      case "focus-recommendation":
        userContent = JSON.stringify(body.tasks ?? []);
        break;
    }

    const result = await callDeepSeek([
      { role: "system", content: system },
      { role: "user", content: userContent },
    ]);

    if (result instanceof Response) return result;

    let parsed: Record<string, unknown> | null = null;
    if (body.type === "generate-subtasks" || body.type === "focus-recommendation") {
      try { parsed = JSON.parse(result); } catch { /* pas du JSON */ }
    }

    return new Response(JSON.stringify({ result, parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
