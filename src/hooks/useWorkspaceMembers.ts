import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type WorkspaceMember = Database["public"]["Tables"]["workspace_members"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

export interface WorkspaceMemberWithProfile extends WorkspaceMember {
  profile: Profile | null;
}

export const useWorkspaceMembers = () => {
  const { currentWorkspace } = useAppStore();
  const [members, setMembers] = useState<WorkspaceMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!currentWorkspace) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: rows } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", currentWorkspace.id)
      .order("joined_at", { ascending: true });

    const memberRows = rows ?? [];
    if (memberRows.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const userIds = memberRows.map((member) => member.user_id);
    const { data: profiles } = await supabase.from("profiles").select("*").in("id", userIds);
    const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

    setMembers(memberRows.map((member) => ({ ...member, profile: profileById.get(member.user_id) ?? null })));
    setLoading(false);
  }, [currentWorkspace]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const updateMemberRole = useCallback(
    async (memberId: string, role: WorkspaceRole) => {
      await supabase.from("workspace_members").update({ role }).eq("id", memberId);
      await fetchMembers();
    },
    [fetchMembers],
  );

  const updateVisibleCategories = useCallback(
    async (memberId: string, visibleCategories: string[]) => {
      await supabase.from("workspace_members").update({ visible_categories: visibleCategories }).eq("id", memberId);
      await fetchMembers();
    },
    [fetchMembers],
  );

  return { members, loading, fetchMembers, updateMemberRole, updateVisibleCategories };
};
