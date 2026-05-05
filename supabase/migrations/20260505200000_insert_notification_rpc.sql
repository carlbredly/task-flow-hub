-- RPC to insert a notification (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.insert_notification(
  _user_id uuid,
  _title text,
  _message text DEFAULT NULL,
  _type text DEFAULT 'info',
  _task_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, task_id)
  VALUES (_user_id, _title, _message, _type, _task_id);
END;
$$;
