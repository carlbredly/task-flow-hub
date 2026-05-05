import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Task } from "@/hooks/useTasks";

interface AiTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  category: string;
  time_spent: number;
}

export function useAi() {
  const [loading, setLoading] = useState(false);

  const call = useCallback(async <T = string>(body: Record<string, unknown>): Promise<T | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assist", { body });
      if (error) { console.error("AI error:", error); return null; }
      return (data as { result: T })?.result ?? null;
    } catch (e) {
      console.error("AI error:", e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reformulateTitle = useCallback(async (title: string) => {
    return call<string>({ type: "reformulate-title", title });
  }, [call]);

  const generateDescription = useCallback(async (title: string, description?: string | null) => {
    return call<string>({ type: "generate-description", title, description });
  }, [call]);

  const generateSubtasks = useCallback(async (title: string, description?: string | null) => {
    const raw = await call<string>({ type: "generate-subtasks", title, description });
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as string[]) : null;
    } catch {
      return null;
    }
  }, [call]);

  const chat = useCallback(async (title: string, message: string, description?: string | null) => {
    return call<string>({ type: "chat", title, description, message });
  }, [call]);

  const dailySummary = useCallback(async (tasks: Task[]) => {
    const mapped: AiTask[] = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      category: "",
      time_spent: (t as any).time_spent ?? 0,
    }));
    return call<string>({ type: "daily-summary", tasks: mapped });
  }, [call]);

  const focusRecommendation = useCallback(async (tasks: Task[]) => {
    const mapped: AiTask[] = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      category: "",
      time_spent: (t as any).time_spent ?? 0,
    }));
    const raw = await call<string>({ type: "focus-recommendation", tasks: mapped });
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed as { taskId: string; reason: string } | null;
    } catch {
      return null;
    }
  }, [call]);

  return { loading, reformulateTitle, generateDescription, generateSubtasks, chat, dailySummary, focusRecommendation };
}
