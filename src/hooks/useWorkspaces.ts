import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppStore } from "@/stores/useAppStore";

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  invite_token: string;
}

export const useWorkspaces = () => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentWorkspace, setCurrentWorkspace } = useAppStore();

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("workspaces")
        .select("id,name,owner_id,invite_token")
        .order("created_at", { ascending: true });
      if (cancel) return;
      if (!error && data) {
        setWorkspaces(data);
        if (!currentWorkspace && data.length) {
          const stored = localStorage.getItem("trackm:workspace");
          const found = data.find((w) => w.id === stored) ?? data[0];
          setCurrentWorkspace(found);
        }
      }
      setLoading(false);
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return { workspaces, currentWorkspace, setCurrentWorkspace, loading };
};
