import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/stores/useAppStore";
import { randomUUID } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];

export const useTasks = () => {
  const { currentWorkspace } = useAppStore();
  const realtimeInstanceId = useRef(randomUUID());
  const fetchAllRef = useRef<() => Promise<void>>(async () => {});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!currentWorkspace) {
      setTasks([]);
      setCategories([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [t, c] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("*").eq("workspace_id", currentWorkspace.id).order("name"),
    ]);
    if (t.data) setTasks(t.data);
    if (c.data) setCategories(c.data);
    setLoading(false);
  }, [currentWorkspace]);

  fetchAllRef.current = fetchAll;

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime subscription
  useEffect(() => {
    if (!currentWorkspace) return;
    const topic = `ws:${currentWorkspace.id}:${realtimeInstanceId.current}`;
    const ch = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `workspace_id=eq.${currentWorkspace.id}` },
        () => void fetchAllRef.current(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories", filter: `workspace_id=eq.${currentWorkspace.id}` },
        () => void fetchAllRef.current(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [currentWorkspace]);

  return { tasks, categories, loading, refetch: fetchAll };
};
