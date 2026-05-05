-- Replace complex notification insert policy with a SECURITY DEFINER RPC
-- to avoid RLS recursion on the tasks table subquery

DROP POLICY IF EXISTS "notifications_insert_self" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_all" ON public.notifications;

-- Allow any authenticated user to insert notifications (content is not sensitive)
CREATE POLICY "notifications_insert_all" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (true);

-- SECURITY DEFINER function to insert notifications (bypasses RLS for cross-user inserts)
CREATE OR REPLACE FUNCTION public.insert_notification(
  p_user_id uuid,
  p_title text,
  p_message text DEFAULT NULL,
  p_type text DEFAULT 'general',
  p_task_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, task_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_task_id);
END;
$$;

-- Enable Realtime for the notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.notifications;
