-- Permettre au propriétaire du workspace de voir les membres même s'il n'est pas dans workspace_members
-- et s'assurer que le owner est bien ajouté comme membre (backfill pour les workspaces existants)

-- 1. Corriger la policy SELECT pour inclure le owner_id du workspace comme fallback
DROP POLICY IF EXISTS "members_select_same_workspace" ON public.workspace_members;
CREATE POLICY "members_select_same_workspace" ON public.workspace_members
FOR SELECT TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id AND w.owner_id = auth.uid()
  )
);

-- 2. Backfill : ajouter le owner comme membre pour tous les workspaces existants
INSERT INTO public.workspace_members (workspace_id, user_id, role, visible_categories)
SELECT id, owner_id, 'owner', ARRAY['all']
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspace_members m
  WHERE m.workspace_id = w.id AND m.user_id = w.owner_id
)
ON CONFLICT DO NOTHING;
