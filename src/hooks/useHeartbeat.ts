import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useHeartbeat() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!user) return;

    const beat = async () => {
      try {
        await (supabase.rpc as any)("heartbeat");
      } catch {}
    };

    beat();
    intervalRef.current = setInterval(beat, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);
}

export function isOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < 120_000; // 2 minutes
}
