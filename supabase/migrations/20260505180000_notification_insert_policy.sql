-- Allow inserting notifications for any workspace member
-- Needed so owner/admin can create assignment notifications for other users
DROP POLICY IF EXISTS "notifications_insert_self" ON public.notifications;
CREATE POLICY "notifications_insert_self" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.workspace_id = (
        SELECT t.workspace_id FROM public.tasks t WHERE t.id = task_id
      )
      AND wm.role IN ('owner', 'admin')
  )
);
