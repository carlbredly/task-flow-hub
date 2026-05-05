-- Add time_spent column to tasks (in seconds)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS time_spent integer NOT NULL DEFAULT 0;

-- RPC to accumulate time on a task
CREATE OR REPLACE FUNCTION public.add_time_spent(task_id uuid, seconds integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.tasks
  SET time_spent = COALESCE(time_spent, 0) + seconds
  WHERE id = task_id;
END;
$$;
