import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/stores/useAppStore";
import type { Database } from "@/integrations/supabase/types";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];

export const useTasks = () => {
  const { currentWorkspace } = useAppStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    const [t, c] = await Promise.all([
      supabase.from("tasks").select("*").eq("workspace_id", currentWorkspace.id).order("created_at", { ascending: false }),
      supabase.from("categories").select("*").eq("workspace_id", currentWorkspace.id).order("name"),
    ]);
    if (t.data) setTasks(t.data);
    if (c.data) setCategories(c.data);
    setLoading(false);
  }, [currentWorkspace]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime subscription
  useEffect(() => {
    if (!currentWorkspace) return;
    const ch = supabase
      .channel(`ws-${currentWorkspace.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `workspace_id=eq.${currentWorkspace.id}` }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "categories", filter: `workspace_id=eq.${currentWorkspace.id}` }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [currentWorkspace, fetchAll]);

  return { tasks, categories, loading, refetch: fetchAll };
};
